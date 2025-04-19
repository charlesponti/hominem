import Alert from '@hominem/components/Alert'
import { LoadingScreen } from '@hominem/components/Loading'
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'

import ListInviteForm from 'src/components/ListInviteForm'
import { useGetList, useGetListInvites } from 'src/lib/api'
import { withAuth } from 'src/lib/utils'

const ListInvites = () => {
  const params = useParams()
  const listId = params.id
  const { data: userList, status: listStatus } = useGetList(listId)
  const {
    data: listInvites,
    status: invitesStatus,
    refetch: getInvites,
  } = useGetListInvites(listId)
  const onInviteSuccess = useCallback(() => getInvites(), [getInvites])

  if ([listStatus, invitesStatus].indexOf('pending') >= 0) {
    return <LoadingScreen />
  }

  if (!userList) {
    return <Alert type="error">We could not find this list.</Alert>
  }

  return (
    <>
      <div className="flex flex-col px-0.5">
        <h1 className="text-2xl">
          <Link to={`/list/${userList.id}`}>
            <span className="font-extrabold text-4xl mr-4">{userList.name}</span>
          </Link>
          <span className="text-primary-focus">Invites</span>
        </h1>
      </div>
      <ListInviteForm listId={listId} onCreate={onInviteSuccess} />
      {listInvites.length > 0 ? (
        <ul className="space-y-4">
          {listInvites.map(({ accepted, invitedUserEmail }) => (
            <li
              key={invitedUserEmail}
              className="p-4 text-lg flex flex-row justify-between border-2 border-gray-100 rounded-md"
            >
              <p className="text-sm text-gray-400">{invitedUserEmail}</p>
              {accepted ? (
                <span className="text-sm">✅ Accepted</span>
              ) : (
                <span className="text-sm">⏳ Pending</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-lg flex justify-center p-4 font-semibold">
          You haven&apos;t invited anyone to this list.
        </p>
      )}
    </>
  )
}

export const Component = withAuth(ListInvites)
