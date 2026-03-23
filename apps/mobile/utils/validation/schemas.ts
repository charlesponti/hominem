import { z } from 'zod';

export const SettingsSchema = z.object({
  id: z.string(),
  theme: z.string().nullable().optional(),
  preferencesJson: z.string().nullable().optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const MediaSchema = z.object({
  id: z.string(),
  type: z.string(),
  localURL: z.string(),
  createdAt: z.iso.datetime(),
});

export type Media = z.infer<typeof MediaSchema>;
