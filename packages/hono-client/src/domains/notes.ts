import type { RawHonoClient } from '../core/raw-client'
import type {
  NotesArchiveOutput,
  NotesCreateInput,
  NotesCreateOutput,
  NotesDeleteOutput,
  NotesGetOutput,
  NotesListInput,
  NotesListOutput,
  NotesSyncInput,
  NotesSyncOutput,
  NotesUpdateInput,
  NotesUpdateOutput,
} from '@hominem/hono-rpc/types/notes.types'

export interface NotesGetInput {
  id: string
}

export interface NotesUpdateByIdInput extends NotesUpdateInput {
  id: string
}

export interface NotesDeleteInput {
  id: string
}

export interface NotesArchiveInput {
  id: string
}

function toNotesQuery(input: NotesListInput): Record<string, string> {
  const query: Record<string, string> = {}

  if (input.types) {
    query.types = input.types.join(',')
  }
  if (input.status) {
    query.status = input.status.join(',')
  }
  if (input.tags) {
    query.tags = input.tags.join(',')
  }
  if (input.query) {
    query.query = input.query
  }
  if (input.since) {
    query.since = input.since
  }
  if (input.sortBy) {
    query.sortBy = input.sortBy
  }
  if (input.sortOrder) {
    query.sortOrder = input.sortOrder
  }
  if (typeof input.limit === 'number') {
    query.limit = String(input.limit)
  }
  if (typeof input.offset === 'number') {
    query.offset = String(input.offset)
  }
  if (typeof input.includeAllVersions === 'boolean') {
    query.includeAllVersions = String(input.includeAllVersions)
  }

  return query
}

export interface NotesClient {
  list(input: NotesListInput): Promise<NotesListOutput>
  listFocusItems(): Promise<NotesListOutput>
  get(input: NotesGetInput): Promise<NotesGetOutput>
  create(input: NotesCreateInput): Promise<NotesCreateOutput>
  update(input: NotesUpdateByIdInput): Promise<NotesUpdateOutput>
  delete(input: NotesDeleteInput): Promise<NotesDeleteOutput>
  archive(input: NotesArchiveInput): Promise<NotesArchiveOutput>
  sync(input: NotesSyncInput): Promise<NotesSyncOutput>
}

export function createNotesClient(rawClient: RawHonoClient): NotesClient {
  return {
    async list(input) {
      const res = await rawClient.api.notes.$get({
        query: toNotesQuery(input),
      })
      return res.json() as Promise<NotesListOutput>
    },
    async listFocusItems() {
      const res = await rawClient.api.notes.$get({
        query: {
          status: 'draft,published',
        },
      })
      return res.json() as Promise<NotesListOutput>
    },
    async get(input) {
      const res = await rawClient.api.notes[':id'].$get({
        param: { id: input.id },
      })
      return res.json() as Promise<NotesGetOutput>
    },
    async create(input) {
      const res = await rawClient.api.notes.$post({
        json: input,
      })
      return res.json() as Promise<NotesCreateOutput>
    },
    async update(input) {
      const { id, ...data } = input
      const res = await rawClient.api.notes[':id'].$patch({
        param: { id },
        json: data,
      })
      return res.json() as Promise<NotesUpdateOutput>
    },
    async delete(input) {
      const res = await rawClient.api.notes[':id'].$delete({
        param: { id: input.id },
      })
      return res.json() as Promise<NotesDeleteOutput>
    },
    async archive(input) {
      const res = await rawClient.api.notes[':id'].archive.$post({
        param: { id: input.id },
      })
      return res.json() as Promise<NotesArchiveOutput>
    },
    async sync(input) {
      const res = await rawClient.api.notes.sync.$post({
        json: input,
      })
      return res.json() as Promise<NotesSyncOutput>
    },
  }
}
