import {
  createPerson,
  deletePerson,
  getPeople,
  getPersonById,
  updatePerson,
} from "@hominem/data";
import { z } from "zod";
import { protectedProcedure, router } from "../procedures";

const createPersonSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

const updatePersonSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const peopleRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getPeople({ userId: ctx.userId });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return getPersonById(input.id);
    }),

  create: protectedProcedure
    .input(createPersonSchema)
    .mutation(async ({ ctx, input }) => {
      return createPerson({
        userId: ctx.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || undefined,
        phone: input.phone,
      });
    }),

  update: protectedProcedure
    .input(updatePersonSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return updatePerson(id, {
        userId: ctx.userId,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        email: updateData.email || undefined,
        phone: updateData.phone,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return deletePerson(input.id);
    }),
});
