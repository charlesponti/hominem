import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Route } from './+types/life-events.people'

interface Person {
  id: string
  firstName?: string
  lastName?: string
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    const response = await fetch(`${baseUrl}/api/life-events/people`)
    if (!response.ok) {
      throw new Response('Failed to fetch people', { status: response.status })
    }
    return await response.json()
  } catch (error) {
    console.error('Error in loader:', error)
    throw error
  }
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData()
    const personData = Object.fromEntries(formData)

    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const response = await fetch(`${baseUrl}/api/life-events/people`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(personData),
    })

    if (!response.ok) {
      throw new Response('Failed to create person', { status: response.status })
    }

    return { success: true, person: await response.json() }
  } catch (error) {
    console.error('Error in action:', error)
    throw error
  }
}

export default function PeoplePage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate()
  const people = loaderData as Person[]
  const firstNameId = useId()
  const lastNameId = useId()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)

  const deletePerson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this person?')) {
      return
    }

    try {
      const response = await fetch(`/api/life-events/people/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh the page to reload data
        window.location.reload()
      } else {
        const errorData = await response.json()
        console.error('Error deleting person:', errorData.error)
        alert('Failed to delete person')
      }
    } catch (error) {
      console.error('Error deleting person:', error)
      alert('Failed to delete person')
    }
  }

  const startEdit = (person: Person) => {
    setEditingPerson({ ...person })
  }

  const cancelEdit = () => {
    setEditingPerson(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light text-black mb-2">People</h1>
              <p className="text-gray-600">Manage the people in your life events</p>
            </div>
            <button
              type="button"
              className="btn bg-blue-600 text-white hover:bg-blue-700 border-0"
              onClick={() => navigate('/life-events')}
            >
              ← Back to Events
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Add Person Button */}
        <div className="mb-8">
          <button
            type="button"
            className="btn bg-green-600 text-white hover:bg-green-700 border-0"
            onClick={() => setShowAddForm(true)}
          >
            + Add New Person
          </button>
        </div>

        {/* Add Person Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-xl font-medium text-black mb-4">Add New Person</h3>
            <form method="post">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor={firstNameId}
                    className="block text-sm font-medium text-black mb-2"
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id={firstNameId}
                    name="firstName"
                    placeholder="Enter first name"
                    className="input input-bordered w-full bg-white border-gray-300 text-black focus:border-black"
                  />
                </div>
                <div>
                  <label htmlFor={lastNameId} className="block text-sm font-medium text-black mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id={lastNameId}
                    name="lastName"
                    placeholder="Enter last name"
                    className="input input-bordered w-full bg-white border-gray-300 text-black focus:border-black"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn bg-green-600 text-white hover:bg-green-700 border-0"
                >
                  Add Person
                </button>
                <button
                  type="button"
                  className="btn bg-gray-500 text-white hover:bg-gray-600 border-0"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* People List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {people.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No people found. Add your first person above!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {people.map((person) => (
                <div key={person.id} className="p-6">
                  {editingPerson && editingPerson.id === person.id ? (
                    /* Edit Form */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label
                          htmlFor={`editFirstName-${person.id}`}
                          className="block text-sm font-medium text-black mb-2"
                        >
                          First Name
                        </label>
                        <input
                          type="text"
                          id={`editFirstName-${person.id}`}
                          value={editingPerson.firstName || ''}
                          onChange={(e) =>
                            setEditingPerson((prev) =>
                              prev ? { ...prev, firstName: e.target.value } : null
                            )
                          }
                          className="input input-bordered w-full bg-white border-gray-300 text-black focus:border-black"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`editLastName-${person.id}`}
                          className="block text-sm font-medium text-black mb-2"
                        >
                          Last Name
                        </label>
                        <input
                          type="text"
                          id={`editLastName-${person.id}`}
                          value={editingPerson.lastName || ''}
                          onChange={(e) =>
                            setEditingPerson((prev) =>
                              prev ? { ...prev, lastName: e.target.value } : null
                            )
                          }
                          className="input input-bordered w-full bg-white border-gray-300 text-black focus:border-black"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-black">
                          {`${person.firstName || ''} ${person.lastName || ''}`.trim() ||
                            'Unnamed Person'}
                        </h3>
                        <p className="text-sm text-gray-500">ID: {person.id}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 border-0"
                          onClick={() => startEdit(person)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm bg-red-600 text-white hover:bg-red-700 border-0"
                          onClick={() => deletePerson(person.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  {editingPerson && editingPerson.id === person.id && (
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        className="btn bg-blue-600 text-white hover:bg-blue-700 border-0"
                        onClick={() => {
                          // Handle update logic here
                          setEditingPerson(null)
                        }}
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className="btn bg-gray-500 text-white hover:bg-gray-600 border-0"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
