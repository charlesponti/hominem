import { json, useLoaderData, Link } from 'react-router'
import { trpc } from '~/lib/trpc/client'
import type { Route } from '../+types/lists._index'

export async function loader({ request }: Route.LoaderArgs) {
  const lists = await trpc.lists.getAll.query()
  return json({ lists })
}

export default function ListsPage() {
  const { lists } = useLoaderData<typeof loader>()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Lists</h1>
      <div className="space-y-4">
        {lists.map((list) => (
          <Link to={`/lists/${list.id}`} key={list.id} className="p-4 border rounded-lg block">
            <h2 className="text-xl font-semibold">{list.name}</h2>
            <p className="text-gray-600">{list.itemCount} places</p>
          </Link>
        ))}
      </div>
    </div>
  )
}