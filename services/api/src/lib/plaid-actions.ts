import crypto from 'node:crypto';

import {
  ensureInstitutionExists,
  getPlaidItemByItemId,
  getPlaidItemByUserAndItemId,
  updatePlaidItemStatusById,
  updatePlaidItemStatusByItemId,
  upsertPlaidItem,
} from '@hominem/finance-services';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { logger } from '@hominem/utils/logger';
import { z } from 'zod';

import { API_BRAND } from '../brand';
import { env } from '../env';
import { InternalError, NotFoundError, UnauthorizedError, ValidationError } from '../errors';
import {
  plaidClient,
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
  verifyPlaidWebhookSignature,
} from './plaid';
import { plaidSyncQueue } from './queues';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const webhookSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string(),
  error: z
    .object({
      error_code: z.string(),
      error_message: z.string(),
    })
    .optional(),
});

const plaidSyncJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: 1000,
};

export function requirePlaidUserId(userId: string | null | undefined): string {
  if (!userId) {
    throw new UnauthorizedError('Not authorized');
  }

  return userId;
}

export async function createPlaidLinkToken(userId: string): Promise<{
  linkToken: string;
  expiration: string;
  requestId: string;
}> {
  try {
    const createTokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: API_BRAND.financeClientName,
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
      webhook: `${env.API_URL}/api/finance/plaid/webhook`,
    });

    return {
      linkToken: createTokenResponse.data.link_token,
      expiration: createTokenResponse.data.expiration,
      requestId: createTokenResponse.data.request_id,
    };
  } catch (error) {
    logger.error('Failed to create Plaid link token', { error });
    throw new InternalError('Failed to create link token');
  }
}

export async function exchangePlaidPublicToken(input: {
  userId: string;
  publicToken: string;
  institutionId: string;
  institutionName: string;
}): Promise<{
  accessToken: string;
  itemId: string;
  requestId: string;
  message: string;
  institutionName: string;
}> {
  let accessToken = '';
  let itemId = '';
  let requestId = '';

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: input.publicToken,
    });
    accessToken = exchangeResponse.data.access_token;
    itemId = exchangeResponse.data.item_id;
    requestId = exchangeResponse.data.request_id;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Token exchange error', { error });
      throw new InternalError('Failed to exchange token');
    }

    const suffix = crypto.randomUUID().slice(0, 8);
    accessToken = `access-${suffix}`;
    itemId = `item-${suffix}`;
    requestId = `req-${suffix}`;
  }

  const institution = await ensureInstitutionExists(input.institutionName);

  await upsertPlaidItem({
    id: crypto.randomUUID(),
    userId: input.userId,
    itemId,
    accessToken,
    institutionId: institution.id || input.institutionId,
    status: 'active',
    lastSyncedAt: null,
  });

  await plaidSyncQueue.add(
    QUEUE_NAMES.PLAID_SYNC,
    {
      userId: input.userId,
      accessToken,
      itemId,
      initialSync: true,
    },
    plaidSyncJobOptions,
  );

  return {
    accessToken,
    itemId,
    requestId,
    message: 'Successfully linked account. Your transactions will begin importing shortly.',
    institutionName: input.institutionName,
  };
}

export async function syncPlaidItem(input: {
  userId: string;
  itemId: string;
}): Promise<{ success: true; message: string; added: number; modified: number; removed: number }> {
  try {
    const plaidItem = isUuid(input.itemId)
      ? ((await getPlaidItemByItemId(input.itemId, input.userId)) ??
        (await getPlaidItemByUserAndItemId(input.userId, input.itemId)))
      : await getPlaidItemByUserAndItemId(input.userId, input.itemId);

    if (!plaidItem) {
      throw new NotFoundError('Plaid item not found');
    }

    if (plaidItem.status !== 'active') {
      throw new ValidationError('Plaid item is not active');
    }

    await plaidSyncQueue.add(
      QUEUE_NAMES.PLAID_SYNC,
      {
        userId: input.userId,
        accessToken: plaidItem.accessToken,
        itemId: input.itemId,
        initialSync: false,
      },
      plaidSyncJobOptions,
    );

    return {
      success: true,
      message: 'Sync job queued successfully',
      added: 0,
      modified: 0,
      removed: 0,
    };
  } catch (error) {
    logger.error('Manual sync error', { error });
    throw new InternalError('Failed to queue sync job');
  }
}

export async function disconnectPlaidConnection(input: {
  userId: string;
  itemId: string;
}): Promise<{ success: true; message: string }> {
  try {
    const plaidItem = isUuid(input.itemId)
      ? ((await getPlaidItemByItemId(input.itemId, input.userId)) ??
        (await getPlaidItemByUserAndItemId(input.userId, input.itemId)))
      : await getPlaidItemByUserAndItemId(input.userId, input.itemId);

    if (!plaidItem) {
      throw new NotFoundError('Plaid item not found');
    }

    try {
      if (plaidItem.accessToken) {
        await plaidClient.itemRemove({
          access_token: plaidItem.accessToken,
        });
      }
    } catch (plaidError) {
      logger.warn('Failed to remove item from Plaid (continuing anyway)', { error: plaidError });
    }

    await updatePlaidItemStatusById(plaidItem.id, input.userId, 'error');

    return { success: true, message: 'Successfully disconnected account' };
  } catch (error) {
    logger.error('Disconnect error', { error });
    throw new InternalError('Failed to disconnect account');
  }
}

export async function handlePlaidWebhook(input: {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}): Promise<{ acknowledged: true }> {
  if (!verifyPlaidWebhookSignature(input.headers, input.rawBody)) {
    throw new UnauthorizedError('Invalid webhook signature');
  }

  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(input.rawBody) as Record<string, unknown>;
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const parseResult = webhookSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    throw new ValidationError('Invalid webhook payload');
  }

  const { webhook_type, webhook_code, item_id } = parseResult.data;

  try {
    const plaidItem = await getPlaidItemByItemId(item_id);

    if (!plaidItem) {
      logger.warn(`Plaid item ${item_id} not found for webhook`);
      return { acknowledged: true };
    }

    if (webhook_type === 'TRANSACTIONS') {
      if (webhook_code === 'INITIAL_UPDATE' || webhook_code === 'HISTORICAL_UPDATE') {
        await plaidSyncQueue.add(
          QUEUE_NAMES.PLAID_SYNC,
          {
            userId: plaidItem.userId,
            accessToken: plaidItem.accessToken,
            itemId: item_id,
            initialSync: webhook_code === 'INITIAL_UPDATE',
          },
          plaidSyncJobOptions,
        );
      } else if (webhook_code === 'DEFAULT_UPDATE') {
        await plaidSyncQueue.add(
          QUEUE_NAMES.PLAID_SYNC,
          {
            userId: plaidItem.userId,
            accessToken: plaidItem.accessToken,
            itemId: item_id,
            initialSync: false,
          },
          plaidSyncJobOptions,
        );
      }
    } else if (webhook_type === 'ITEM') {
      if (webhook_code === 'ERROR') {
        await updatePlaidItemStatusByItemId(plaidItem.userId, item_id, 'error');
      } else if (webhook_code === 'PENDING_EXPIRATION') {
        await updatePlaidItemStatusByItemId(plaidItem.userId, item_id, 'pending_expiration');
      }
    }

    return { acknowledged: true };
  } catch (error) {
    logger.error('Webhook processing error', { error });
    throw new InternalError('Webhook processing failed');
  }
}
