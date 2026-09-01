import { Hono } from 'hono';

import {
  ChatSpeechMessageNotFoundError,
  ChatSpeechUnavailableError,
  chatSpeechService,
} from '../../application/chat-speech.service';
import { NotFoundError, UnavailableError } from '../errors';
import type { AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { getChatId, getMessageId } from './chats.route-helpers';

export const chatSpeechRoutes = new Hono<AppContext>()
  .use(
    '/messages/:messageId/speech',
    rateLimitMiddleware({ bucket: 'chat-speech', windowSec: 60, max: 20 }),
  )
  .get('/messages/:messageId/speech', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);

    let result;
    try {
      result = await chatSpeechService.streamMessageSpeech({
        chatId,
        messageId,
        ownerUserId: userId,
      });
    } catch (error) {
      if (error instanceof ChatSpeechMessageNotFoundError) {
        throw new NotFoundError(error.message);
      }
      if (error instanceof ChatSpeechUnavailableError) {
        throw new UnavailableError(error.message);
      }
      throw error;
    }

    return new Response(result.stream, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': result.mimeType,
        'X-Content-Type-Options': 'nosniff',
        'Server-Timing': `speech-provider;dur=${result.providerReadyDurationMs}`,
      },
    });
  });
