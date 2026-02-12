import type { Person } from '@hominem/hono-rpc/types/people.types';
import type React from 'react';

import { Textarea } from '@hominem/ui/components/ui/textarea';
import { useState } from 'react';

import { usePeople } from '~/lib/hooks/use-people';

interface EventFormProps {
  showAddForm: boolean;
  onToggleForm: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ showAddForm, onToggleForm: _onToggleForm }) => {
  const { data: peopleResult, isLoading: isLoadingPeople } = usePeople();
  const people = Array.isArray(peopleResult) ? peopleResult : [];
  const [_selectedPeople, setSelectedPeople] = useState<Person[]>([]);

  const handlePeopleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions, (option) => option.value);
    const selectedPeopleList = people.filter((person) => selectedIds.includes(person.id));
    setSelectedPeople(selectedPeopleList);
  };

  return (
    <>
      {showAddForm && (
        <div>
          <h3 className="text-xl font-semibold mb-6 text-foreground">Add New Event</h3>
          <form method="post">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="date"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-muted-foreground"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  default_value={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 text-sm border bg-card text-foreground border-border focus:border-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="time"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-muted-foreground"
                >
                  Time
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  className="w-full px-3 py-2 text-sm border bg-card text-foreground border-border focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-muted-foreground"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="e.g., Movie Night"
                  required
                  className="w-full px-3 py-2 text-sm border bg-card text-foreground border-border focus:border-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-muted-foreground"
                >
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  placeholder="e.g., AMC Theater"
                  className="w-full px-3 py-2 text-sm border bg-card text-foreground border-border focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="people"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-muted-foreground"
                >
                  People
                </label>
                <select
                  id="people"
                  name="people"
                  multiple
                  onChange={handlePeopleChange}
                  disabled={isLoadingPeople}
                  className="w-full px-3 py-2 text-sm border bg-card text-foreground border-border focus:border-primary min-h-[100px] disabled:"
                >
                  {isLoadingPeople ? (
                    <option disabled>Loading people...</option>
                  ) : (
                    people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.firstName || ''} {person.lastName || ''}
                      </option>
                    ))
                  )}
                </select>
                <div className="text-xs mt-1 text-muted-foreground">
                  Hold Ctrl/Cmd to select multiple people
                </div>
              </div>
              <div>
                <label
                  htmlFor="tags"
                  className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-muted-foreground"
                >
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  placeholder="Comma-separated tags"
                  className="w-full px-3 py-2 text-sm border bg-card text-foreground border-border focus:border-primary"
                />
              </div>
            </div>
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-xs font-medium uppercase tracking-wide mb-1.5 text-muted-foreground"
              >
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional detailed description"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground"
              >
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default EventForm;
