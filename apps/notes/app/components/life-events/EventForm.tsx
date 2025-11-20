import type React from 'react'
import { useState } from 'react'

interface Person {
  id: string
  firstName?: string
  lastName?: string
}

interface EventFormProps {
  showAddForm: boolean
  people: Person[]
  onToggleForm: () => void
}

const EventForm: React.FC<EventFormProps> = ({ showAddForm, people, onToggleForm }) => {
  const [_selectedPeople, setSelectedPeople] = useState<Person[]>([])

  const handlePeopleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions, (option) => option.value)
    const selectedPeopleList = people.filter((person) => selectedIds.includes(person.id))
    setSelectedPeople(selectedPeopleList)
  }

  return (
    <>
      {showAddForm && (
        <div>
          <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-notion-text)' }}>
            Add New Event
          </h3>
          <form method="post">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="date"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--color-notion-text-secondary)' }}
                >
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 text-sm border rounded-md transition-all duration-150 focus:-translate-y-px"
                  style={{
                    backgroundColor: 'var(--color-notion-bg)',
                    color: 'var(--color-notion-text)',
                    borderColor: 'var(--color-notion-border)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-blue)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="time"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--color-notion-text-secondary)' }}
                >
                  Time
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  className="w-full px-3 py-2 text-sm border rounded-md transition-all duration-150 focus:-translate-y-px"
                  style={{
                    backgroundColor: 'var(--color-notion-bg)',
                    color: 'var(--color-notion-text)',
                    borderColor: 'var(--color-notion-border)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-blue)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--color-notion-text-secondary)' }}
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="e.g., Movie Night"
                  required
                  className="w-full px-3 py-2 text-sm border rounded-md transition-all duration-150 focus:-translate-y-px"
                  style={{
                    backgroundColor: 'var(--color-notion-bg)',
                    color: 'var(--color-notion-text)',
                    borderColor: 'var(--color-notion-border)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-blue)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--color-notion-text-secondary)' }}
                >
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  placeholder="e.g., AMC Theater"
                  className="w-full px-3 py-2 text-sm border rounded-md transition-all duration-150 focus:-translate-y-px"
                  style={{
                    backgroundColor: 'var(--color-notion-bg)',
                    color: 'var(--color-notion-text)',
                    borderColor: 'var(--color-notion-border)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-blue)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="people"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--color-notion-text-secondary)' }}
                >
                  People
                </label>
                <select
                  id="people"
                  name="people"
                  multiple
                  onChange={handlePeopleChange}
                  className="w-full px-3 py-2 text-sm border rounded-md transition-all duration-150 focus:-translate-y-px"
                  style={{
                    backgroundColor: 'var(--color-notion-bg)',
                    color: 'var(--color-notion-text)',
                    borderColor: 'var(--color-notion-border)',
                    minHeight: '100px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-blue)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName || ''} {person.lastName || ''}
                    </option>
                  ))}
                </select>
                <div
                  className="text-xs mt-1"
                  style={{ color: 'var(--color-notion-text-tertiary)' }}
                >
                  Hold Ctrl/Cmd to select multiple people
                </div>
              </div>
              <div>
                <label
                  htmlFor="tags"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--color-notion-text-secondary)' }}
                >
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  placeholder="Comma-separated tags"
                  className="w-full px-3 py-2 text-sm border rounded-md transition-all duration-150 focus:-translate-y-px"
                  style={{
                    backgroundColor: 'var(--color-notion-bg)',
                    color: 'var(--color-notion-text)',
                    borderColor: 'var(--color-notion-border)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-blue)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-notion-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--color-notion-text-secondary)' }}
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Optional detailed description"
                rows={3}
                className="w-full px-3 py-2 text-sm border rounded-md transition-all duration-150 resize-none focus:-translate-y-px"
                style={{
                  backgroundColor: 'var(--color-notion-bg)',
                  color: 'var(--color-notion-text)',
                  borderColor: 'var(--color-notion-border)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-notion-blue)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-notion-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--color-notion-text)',
                  color: 'var(--color-notion-bg)',
                }}
              >
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default EventForm
