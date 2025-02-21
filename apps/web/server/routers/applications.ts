import { JobApplicationInsertSchema } from "@ponti/utils/career";
import { db } from "@ponti/utils/db";
import { job_applications } from "@ponti/utils/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const applicationsRouter = router({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		return await db
			.select()
			.from(job_applications)
			.where(eq(job_applications.userId, ctx.userId))
			.orderBy(desc(job_applications.createdAt));
	}),

	getById: protectedProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			const application = await db.query.job_applications.findFirst({
				where: eq(job_applications.id, input),
			});

			if (!application) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Application not found",
				});
			}

			if (application.userId !== ctx.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to view this application",
				});
			}

			return application;
		}),

	create: protectedProcedure
		.input(JobApplicationInsertSchema)
		.mutation(async ({ ctx, input }) => {
			return await db.insert(job_applications).values({
				...input,
				userId: ctx.userId,
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				data: JobApplicationInsertSchema.partial(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [application] = await db
				.select()
				.from(job_applications)
				.where(eq(job_applications.id, input.id));

			if (!application) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Application not found",
				});
			}

			if (application.userId !== ctx.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to update this application",
				});
			}

			return await db
				.update(job_applications)
				.set(input.data)
				.where(eq(job_applications.id, input.id))
				.returning();
		}),

	delete: protectedProcedure
		.input(z.string())
		.mutation(async ({ ctx, input }) => {
			const application = await db.query.job_applications.findFirst({
				where: eq(job_applications.id, input),
			});

			if (!application) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Application not found",
				});
			}

			if (application.userId !== ctx.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to delete this application",
				});
			}

			return await db
				.delete(job_applications)
				.where(eq(job_applications.id, input));
		}),

	bulkPut: protectedProcedure
		.input(z.array(JobApplicationInsertSchema))
		.mutation(async ({ ctx, input }) => {
			// Create a transaction to update all applications
			return await db.transaction(async (tx) => {
				return Promise.all(
					input.map((application) =>
						tx
							.insert(job_applications)
							.values({
								...application,
								userId: ctx.userId,
							})
							.onConflictDoUpdate({
								target: [job_applications.position, job_applications.companyId],
								set: application,
							}),
					),
				);
			});
		}),
});
