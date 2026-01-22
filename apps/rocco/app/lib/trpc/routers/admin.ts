import { refreshAllPlaces } from '@hominem/places-services';
import { sendAdminNotification } from '@hominem/services/emails';
import * as z from 'zod';

import { adminProcedure, router } from '../context';

export const adminRouter = router({
  refreshGooglePlaces: adminProcedure.input(z.object({})).mutation(async () => {
    const start = Date.now();
    const { updatedCount, errors } = await refreshAllPlaces();
    const duration = Date.now() - start;

    await sendAdminNotification({
      action: 'Refresh Google Maps Places',
      adminUser: 'admin@example.com',
      updatedCount,
      duration,
      errors,
    });

    return { updatedCount, duration, errors };
  }),
});
