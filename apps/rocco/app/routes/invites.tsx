import { useLoaderData, useRevalidator } from 'react-router'
import InviteListItem from '~/components/InviteListItem'
import type { InviteItem } from '~/lib/component-types'
import { createCaller } from '~/lib/trpc/server'
import type { Route } from './+types/'

export async function loader({ request }: Route.LoaderArgs) {
  const trpcServer = createCaller(request)
  const invites = await trpcServer.invites.getAll()
  return { invites }
}

const Invites = () => {
  const { invites } = useLoaderData<typeof loader>()
  const { revalidate } = useRevalidator()

  const handleAccept = () => {
    revalidate()
  }

  return (
    <>
      <h1 className="text-4xl mb-4">Invites</h1>
      {invites && (
        <ul className="space-y-4">
          {invites.map((listInvite: InviteItem) => (
            <InviteListItem
              key={listInvite.listId}
              listInvite={listInvite}
              onAccept={handleAccept}
            />
          ))}
        </ul>
      )}
    </>
  )
}

export default Invites

export function ErrorBoundary({ error }: { error: unknown }) {
  console.error(error)
  return <div>An unexpected error occurred while loading invites.</div>
}
