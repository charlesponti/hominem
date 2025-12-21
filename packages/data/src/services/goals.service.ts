import { and, asc, desc, eq, ilike, ne } from "drizzle-orm";
import { db } from "../db";
import { goals, type GoalInsert } from "../db/schema";

export async function listGoals(params: {
  userId: string;
  showArchived?: boolean;
  sortBy?: "priority" | "dueDate" | "createdAt";
  category?: string;
}) {
  const whereClauses = [eq(goals.userId, params.userId)];
  if (!params.showArchived) {
    whereClauses.push(ne(goals.status, "archived"));
  }
  if (params.category) {
    whereClauses.push(ilike(goals.goalCategory, `%${params.category}%`));
  }

  const orderBy =
    params.sortBy === "dueDate"
      ? [asc(goals.dueDate)]
      : params.sortBy === "createdAt"
      ? [desc(goals.createdAt)]
      : [asc(goals.priority)];

  return db
    .select()
    .from(goals)
    .where(and(...whereClauses))
    .orderBy(...orderBy);
}

export async function getGoal(id: string, userId: string) {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return goal ?? null;
}

export async function createGoal(data: Omit<GoalInsert, "id">) {
  const [goal] = await db.insert(goals).values(data).returning();
  return goal;
}

export async function updateGoal(
  id: string,
  userId: string,
  data: Partial<Omit<GoalInsert, "id" | "userId">>
) {
  const [goal] = await db
    .update(goals)
    .set(data)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();
  return goal ?? null;
}

export async function archiveGoal(id: string, userId: string) {
  const [goal] = await db
    .update(goals)
    .set({ status: "archived" })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();
  return goal ?? null;
}

export async function deleteGoal(id: string, userId: string) {
  const [goal] = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();
  return goal ?? null;
}
