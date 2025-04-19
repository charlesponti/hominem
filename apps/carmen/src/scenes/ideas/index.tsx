import Loading from '@hominem/components/Loading'

import IdeaForm from 'src/components/IdeaForm'
import IdeaListItem from 'src/components/IdeaListItem'
import { useGetIdeas } from 'src/lib/api/ideas'
import { withAuth } from 'src/lib/utils'

const Ideas = () => {
  const { data, refetch, status: ideasStatus } = useGetIdeas()

  return (
    <>
      <IdeaForm onCreate={refetch} />
      <div>
        {ideasStatus === 'pending' && <Loading />}
        {data?.length === 0 && 'your thoughts will appear here'}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((idea) => (
              <IdeaListItem key={idea.id} idea={idea} onDelete={refetch} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export default withAuth(Ideas)
