import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";

export function useApplications(userId?: string | null) {
	const queryClient = useQueryClient();

	const { data: applications, isLoading } = trpc.applications.getAll.useQuery(
		undefined,
		{
			enabled: !!userId,
		},
	);

	const createMutation = trpc.applications.create.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["applications", "getAll"]] });
		},
	});

	const updateMutation = trpc.applications.update.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["applications", "getAll"]] });
		},
	});

	const deleteMutation = trpc.applications.delete.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["applications", "getAll"]] });
		},
	});

	return {
		applications,
		isLoading,
		createApplication: createMutation.mutate,
		updateApplication: updateMutation.mutate,
		deleteApplication: deleteMutation.mutate,
	};
}
