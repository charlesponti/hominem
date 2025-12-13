import { UserPlus } from 'lucide-react'

export default function InvitesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 md:p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
        <UserPlus className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No invitations yet</h3>
      <p className="text-gray-600 max-w-md">
        Use the form above to invite others to collaborate on this list.
      </p>
    </div>
  )
}
