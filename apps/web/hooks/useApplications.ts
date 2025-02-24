import { trpc } from '@/lib/trpc'
import { useQueryClient } from '@tanstack/react-query'

export function useUpdateApplication() {
  const queryClient = useQueryClient()

  const updateMutation = trpc.applications.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['applications', 'getAll']] })
    },
  })

  return updateMutation
}

export function useApplications(userId?: string | null) {
  const queryClient = useQueryClient()
  const updateApplication = useUpdateApplication()
  const { data: applications, isLoading } = trpc.applications.getAll.useQuery(undefined, {
    enabled: !!userId,
  })

  const createMutation = trpc.applications.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['applications', 'getAll']] })
    },
  })

  const deleteMutation = trpc.applications.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['applications', 'getAll']] })
    },
  })

  return {
    applications,
    isLoading,
    createApplication: createMutation.mutate,
    updateApplication: updateApplication.mutate,
    deleteApplication: deleteMutation.mutate,
  }
}
