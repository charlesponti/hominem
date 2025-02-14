import { publicProcedure, router } from "@/server/trpc";
import {
	ApplicationService,
	CompanyService,
	JobApplicationInsertSchema,
} from "@ponti/utils/career";
import { z } from "zod";

export const jobApplicationsRouter = router({
	create: publicProcedure
		.input(JobApplicationInsertSchema)
		.mutation(async ({ input }) => {
			const companyService = new CompanyService();
			const company = await companyService.findById(input.companyId);
			if (!company) {
				throw new Error("Company not found");
			}

			const applicationService = new ApplicationService();
			const applicationId = await applicationService.create(input);

			return applicationService.findById(applicationId.toString());
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string(),
				data: z.object({}).passthrough(),
			}),
		)
		.mutation(async ({ input }) => {
			const applicationService = new ApplicationService();
			const success = await applicationService.update(input.id, input.data);
			if (!success) {
				throw new Error("Application not found");
			}
			return applicationService.findById(input.id);
		}),

	getById: publicProcedure.input(z.string()).query(async ({ input }) => {
		const applicationService = new ApplicationService();
		const application = await applicationService.findById(input);
		if (!application) {
			throw new Error("Application not found");
		}
		return application;
	}),

	getAll: publicProcedure.query(async () => {
		const applicationService = new ApplicationService();
		return applicationService.findMany();
	}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input }) => {
		const applicationService = new ApplicationService();
		const success = await applicationService.delete(input);
		if (!success) {
			throw new Error("Application not found");
		}
		return true;
	}),
});
