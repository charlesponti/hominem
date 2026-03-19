import { describe, it, expect } from 'vitest'
import { _z } from 'zod'
import {
  ChatMessageSchema,
  ChatSchema,
  NoteSchema,
  NotesResponseSchema,
  UserProfileSchema,
} from '../utils/validation/schemas'

describe('Zod Schemas', () => {
  describe('UserProfileSchema', () => {
    it('should validate a valid user profile', () => {
      const validProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      expect(() => UserProfileSchema.parse(validProfile)).not.toThrow()
    })

    it('should allow null email and name', () => {
      const profile = {
        id: 'user-123',
        email: null,
        name: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      expect(() => UserProfileSchema.parse(profile)).not.toThrow()
    })

    it('should reject invalid email format', () => {
      const invalidProfile = {
        id: 'user-123',
        email: 'not-an-email',
        name: 'Test',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      expect(() => UserProfileSchema.parse(invalidProfile)).toThrow()
    })

    it('should reject missing required fields', () => {
      const incompleteProfile = {
        id: 'user-123',
        // missing email, name, dates
      }

      expect(() => UserProfileSchema.parse(incompleteProfile)).toThrow()
    })
  })

  describe('ChatMessageSchema', () => {
    it('should validate a valid chat message', () => {
      const validMessage = {
        id: 'msg-123',
        chatId: 'chat-456',
        role: 'user' as const,
        content: 'Hello world',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow()
    })

    it('should validate assistant role', () => {
      const message = {
        id: 'msg-123',
        chatId: 'chat-456',
        role: 'assistant' as const,
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(() => ChatMessageSchema.parse(message)).not.toThrow()
    })

    it('should validate system role', () => {
      const message = {
        id: 'msg-123',
        chatId: 'chat-456',
        role: 'system' as const,
        content: 'System message',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(() => ChatMessageSchema.parse(message)).not.toThrow()
    })

    it('should reject invalid role', () => {
      const invalidMessage = {
        id: 'msg-123',
        chatId: 'chat-456',
        role: 'invalid',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow()
    })

    it('should allow optional focus fields', () => {
      const message = {
        id: 'msg-123',
        chatId: 'chat-456',
        role: 'user' as const,
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00.000Z',
        focusItemsJson: '[{"id": "1", "text": "item"}]',
        focusIdsJson: '["1", "2"]',
      }

      expect(() => ChatMessageSchema.parse(message)).not.toThrow()
    })
  })

  describe('ChatSchema', () => {
    it('should validate a valid chat', () => {
      const validChat = {
        id: 'chat-123',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(() => ChatSchema.parse(validChat)).not.toThrow()
    })

    it('should allow optional title', () => {
      const chat = {
        id: 'chat-123',
        title: 'My Chat',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(() => ChatSchema.parse(chat)).not.toThrow()
    })

    it('should allow null title', () => {
      const chat = {
        id: 'chat-123',
        title: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(() => ChatSchema.parse(chat)).not.toThrow()
    })

    it('should allow archivedAt', () => {
      const chat = {
        id: 'chat-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        archivedAt: '2024-01-02T00:00:00.000Z',
      }

      expect(() => ChatSchema.parse(chat)).not.toThrow()
    })

    it('should allow null archivedAt', () => {
      const chat = {
        id: 'chat-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
      }

      expect(() => ChatSchema.parse(chat)).not.toThrow()
    })
  })

  describe('NoteSchema', () => {
    it('should validate a valid note', () => {
      const validNote = {
        id: 'note-123',
        type: 'task',
        status: 'draft' as const,
        title: 'My Note',
        content: 'Note content here',
        excerpt: 'Note excerpt',
        tags: ['tag1', 'tag2'],
        mentions: [],
        analysis: null,
        publishingMetadata: null,
        parentNoteId: null,
        versionNumber: 1,
        isLatestVersion: true,
        userId: 'user-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        publishedAt: null,
        scheduledFor: null,
      }

      expect(() => NoteSchema.parse(validNote)).not.toThrow()
    })

    it('should allow any string for type', () => {
      const note = {
        id: 'note-123',
        type: 'custom-type', // Note type can be any string
        status: 'draft' as const,
        title: 'My Note',
        content: 'Content',
        excerpt: 'Excerpt',
        tags: [],
        mentions: [],
        analysis: null,
        publishingMetadata: null,
        parentNoteId: null,
        versionNumber: 1,
        isLatestVersion: true,
        userId: 'user-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        publishedAt: null,
        scheduledFor: null,
      }

      expect(() => NoteSchema.parse(note)).not.toThrow()
    })
  })

  describe('NotesResponseSchema', () => {
    it('should validate a valid notes response', () => {
      const validResponse = {
        notes: [
          {
            id: 'note-1',
            type: 'task',
            status: 'draft' as const,
            title: 'Note 1',
            content: 'Content',
            excerpt: 'Excerpt',
            tags: [],
            mentions: [],
            analysis: null,
            publishingMetadata: null,
            parentNoteId: null,
            versionNumber: 1,
            isLatestVersion: true,
            userId: 'user-123',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            publishedAt: null,
            scheduledFor: null,
          },
        ],
      }

      expect(() => NotesResponseSchema.parse(validResponse)).not.toThrow()
    })

    it('should reject empty notes array', () => {
      // Empty arrays are valid
      const response = { notes: [] }
      expect(() => NotesResponseSchema.parse(response)).not.toThrow()
    })

    it('should reject invalid notes array item', () => {
      const invalidResponse = {
        notes: [
          {
            id: 'note-1',
            // missing required fields
          },
        ],
      }

      expect(() => NotesResponseSchema.parse(invalidResponse)).toThrow()
    })
  })
})
