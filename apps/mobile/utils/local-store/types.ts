export type UserProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  id: string;
  theme?: string | null;
  preferencesJson?: string | null;
};

export type Media = {
  id: string;
  type: string;
  localURL: string;
  createdAt: string;
};
