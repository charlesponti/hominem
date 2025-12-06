import { ArrowLeft, Mail, UserPlus } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useParams } from 'react-router'
import Alert from '~/components/alert'
import ListInviteForm from '~/components/lists/list-invite-form'
import { LoadingScreen } from '~/components/loading'
import { trpc } from '~/lib/trpc/client'

export async function clientLoader() {
  // For now, return empty data and let the client fetch with tRPC
  return { list: null }
}

export default function ListInvites() {
  const params = useParams()
  const listId = params.id || ''
  const { data: list } = trpc.lists.getById.useQuery({ id: listId })
  const {
    data: listInvites = [],
    refetch: getInvites,
    isLoading: isLoadingInvites,
  } = trpc.invites.getByList.useQuery({ listId })
  const deleteInvite = trpc.invites.delete.useMutation()
  const onInviteSuccess = useCallback(() => getInvites(), [getInvites])
  const onDeleteInvite = useCallback(
    async (invitedUserEmail: string) => {
      const confirmed = window.confirm(`Remove invite for ${invitedUserEmail}?`)
      if (!confirmed) return

      await deleteInvite.mutateAsync({ listId, invitedUserEmail })
      await getInvites()
    },
    [deleteInvite, getInvites, listId]
  )

  if (isLoadingInvites) {
    return <LoadingScreen />
  }

  if (!list || !listInvites) {
    return <Alert type="error">We could not find this list.</Alert>
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2">
        <Link
          to={`/lists/${list.id}`}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to list</span>
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{list.name}</h1>
              <p className="text-lg text-gray-600">Manage Invitations</p>
            </div>
          </div>
          <p className="text-base md:text-lg text-gray-700 max-w-2xl">
            Invite others to collaborate on this list and see who you've already invited.
          </p>
        </div>
      </div>

      {/* Invite Form */}
      <ListInviteForm listId={listId} onCreate={onInviteSuccess} />

      {/* Invites List */}
      {listInvites.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Invited Users</h2>
          <ul className="space-y-3">
            {listInvites.map(({ accepted, invitedUserEmail }) => (
              <li
                key={invitedUserEmail}
                className="flex flex-row items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-base font-medium text-gray-900">{invitedUserEmail}</p>
                </div>
                {accepted ? (
                  <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
                    Accepted
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-sm font-medium text-amber-700 bg-amber-100 rounded-full">
                      Pending
                    </span>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:text-red-300"
                      onClick={() => onDeleteInvite(invitedUserEmail)}
                      disabled={deleteInvite.isPending}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No invitations yet</h3>
          <p className="text-gray-600 max-w-md">
            Use the form above to invite others to collaborate on this list.
          </p>
        </div>
      )}
    </div>
  )
}
