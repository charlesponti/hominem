import { Avatar, AvatarFallback, AvatarImage } from '@hominem/ui/components/ui/avatar'
import { Button } from '@hominem/ui/button'
import { Check, Link as LinkIcon, Mail, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import Alert from '~/components/alert'
import ListInviteForm from '~/components/lists/list-invite-form'
import { LoadingScreen } from '~/components/loading'
import PageTitle from '~/components/page-title'
import { env } from '~/lib/env'
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
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
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

  const getInviteUrl = useCallback(
    (token: string) => {
      const baseUrl = env.VITE_APP_BASE_URL.replace(/\/$/, '')
      return `${baseUrl}/invites?token=${token}&listId=${listId}`
    },
    [listId]
  )

  const copyInviteUrl = useCallback(
    async (token: string) => {
      const url = getInviteUrl(token)
      try {
        await navigator.clipboard.writeText(url)
        setCopiedToken(token)
        setTimeout(() => setCopiedToken(null), 2000)
      } catch (error) {
        console.error('Failed to copy invite URL:', error)
      }
    },
    [getInviteUrl]
  )

  if (isLoadingInvites) {
    return <LoadingScreen />
  }

  if (!list || !listInvites) {
    return <Alert type="error">We could not find this list.</Alert>
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="relative">
        <PageTitle
          title={list.name}
          subtitle="Invitations"
          variant="serif"
          actions={
            <Link
              to={`/lists/${list.id}`}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              View List
            </Link>
          }
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-serif font-semibold text-gray-900">Collaborators</h2>
        {/* Invite Form */}
        <ListInviteForm listId={listId} onCreate={onInviteSuccess} />

        {/* Invites List */}
        {listInvites.length > 0 ? (
          <ul className="list-none divide-y divide-gray-200 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {listInvites.map((invite) => {
              const { accepted, invitedUserEmail, token, user_invitedUserId } = invite
              const isCopied = copiedToken === token
              const profilePhoto = user_invitedUserId?.photoUrl || user_invitedUserId?.image
              const userName: string =
                user_invitedUserId?.name || invitedUserEmail.split('@')[0] || 'U'

              return (
                <li
                  key={invitedUserEmail}
                  className="flex flex-col md:flex-row md:items-center gap-3 p-3 group hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {accepted ? (
                      <Avatar className="size-10 shrink-0">
                        {profilePhoto && <AvatarImage src={profilePhoto} alt={userName} />}
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm">
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Mail className="text-gray-400 size-5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-light text-gray-600 truncate text-base">
                        {invitedUserEmail}
                      </p>
                    </div>
                  </div>
                  <div className="ml-0 md:ml-2 flex justify-end items-center gap-3 flex-wrap">
                    {accepted ? (
                      <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
                        Accepted
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyInviteUrl(token)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          title="Copy invite URL"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <LinkIcon className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="p-2"
                          onClick={() => onDeleteInvite(invitedUserEmail)}
                          disabled={deleteInvite.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium text-amber-700 bg-amber-100 rounded-full">
                          Pending
                        </span>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
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
    </div>
  )
}
