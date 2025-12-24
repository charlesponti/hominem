import { createEvent, getEvents, getPeople } from "@hominem/data";
import { z } from "zod";
import { publicProcedure, router } from "../procedures";

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

  create: publicProcedure
    .input(createEventSchema)
    .mutation(async ({ input }) => {
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
        type: input.type,
        tags: input.tags,
        people: input.people,
      });
    }),

  people: router({
    list: publicProcedure.query(async () => getPeople()),
  }),
});
