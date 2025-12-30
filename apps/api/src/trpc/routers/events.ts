import {
  createEvent,
  deleteEvent,
  type EventTypeEnum,
  GoogleCalendarService,
  getEventById,
  getEvents,
  getSyncStatus,
  updateEvent,
} from "@hominem/data";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../procedures";

const listInputSchema = z
  .object({
    tagNames: z.array(z.string()).optional(),
    companion: z.string().optional(),
    sortBy: z.enum(["date-asc", "date-desc", "summary"]).optional(),
  })
  .optional();

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

export const eventsRouter = router({
  list: publicProcedure.input(listInputSchema).query(async ({ input }) => {
    return getEvents({
      tagNames: input?.tagNames,
      companion: input?.companion,
      sortBy: input?.sortBy,
    });
  }),

  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Title is required");
      }

      const dateValue = input.date ? new Date(input.date) : new Date();
      if (Number.isNaN(dateValue.getTime())) {
        throw new Error("Invalid event date");
      }

      return createEvent({
        title,
        description: input.description,
        date: dateValue,
        type: input.type as EventTypeEnum,
        tags: input.tags,
        people: input.people,
        userId: ctx.userId,
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      return getEventById(input.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        title: z.string().optional(),
        description: z.string().optional(),
        date: z.union([z.string(), z.date()]).optional(),
        dateStart: z.union([z.string(), z.date()]).optional(),
        dateEnd: z.union([z.string(), z.date()]).optional(),
        type: z.string().optional(),
        tags: z.array(z.string()).optional(),
        people: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      // Convert string dates to Date objects
      const eventData = {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined,
        dateStart: updateData.dateStart
          ? new Date(updateData.dateStart)
          : undefined,
        dateEnd: updateData.dateEnd ? new Date(updateData.dateEnd) : undefined,
      };

      const updated = await updateEvent(id, eventData);

      // Note: Two-way sync to Google Calendar will be handled by the background worker
      // which monitors for changes and pushes them to Google Calendar

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      // Note: Deletion from Google Calendar will be handled by the background worker
      // which monitors for deletions and syncs them to Google Calendar
      return deleteEvent(input.id);
    }),

  getGoogleCalendars: protectedProcedure
    .input(
      z.object({
        accessToken: z.string(),
        refreshToken: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const googleService = new GoogleCalendarService(ctx.userId, {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
      });

      return googleService.getCalendarList();
    }),

  syncGoogleCalendar: protectedProcedure
    .input(
      z.object({
        calendarId: z.string().optional().default("primary"),
        timeMin: z.string().optional(),
        timeMax: z.string().optional(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // For now, tokens need to be passed from frontend
      // In the future, we can retrieve them from Supabase session server-side
      if (!input.accessToken) {
        throw new Error("Google Calendar access token required");
      }

      const googleService = new GoogleCalendarService(ctx.userId, {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
      });

      return googleService.syncGoogleCalendarEvents(
        input.calendarId,
        input.timeMin,
        input.timeMax
      );
    }),

  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await getSyncStatus(ctx.userId);

    return {
      ...status,
      connected: true, // Assume connected for now
    };
  }),
});
