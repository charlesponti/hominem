import Loading from '@hominem/components/Loading'

import BookmarkForm from 'src/components/BookmarkForm'
import BookmarkListItem from 'src/components/BookmarkListItem'
import { useGetBookmarks } from 'src/lib/api/bookmarks'
import { withAuth } from 'src/lib/utils'

const Bookmarks = () => {
  const { data, refetch, status: bookmarksStatus } = useGetBookmarks()

  return (
    <>
      <BookmarkForm onCreate={refetch} />
      <div>
        {bookmarksStatus === 'pending' && <Loading />}
        {data?.length === 0 && 'your bookmarks will appear here'}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((bookmark) => (
              <BookmarkListItem key={bookmark.id} bookmark={bookmark} onDelete={refetch} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export const Component = withAuth(Bookmarks)
