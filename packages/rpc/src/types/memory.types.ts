export type Memory = {
  id: string;
  title: string | null;
  content: string;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoriesListOutput = { memories: Memory[] };

export type MemoryUpdateInput = {
  title?: string | null;
  content?: string;
};

export type MemoryUpdateOutput = Memory;
export type MemoryDeleteOutput = Memory;
