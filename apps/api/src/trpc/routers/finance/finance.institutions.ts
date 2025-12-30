import {
  createInstitution,
  getAccountById,
  getAllInstitutions,
  getInstitution,
  getInstitutionAccounts,
  getInstitutionById,
  getUserAccounts,
  getUserInstitutionConnections,
  getUserPlaidItemForInstitution,
  updateAccount,
} from "@hominem/data/finance";
import { z } from "zod";
import { protectedProcedure, router } from "../../procedures";

export const institutionsRouter = router({
  // Get all institution connections for the user
  connections: protectedProcedure.query(async ({ ctx }) => {
    return await getUserInstitutionConnections(ctx.userId);
  }),

  // Get all accounts with institution information
  accounts: protectedProcedure.query(async ({ ctx }) => {
    return await getUserAccounts(ctx.userId);
  }),

  // Get accounts for a specific institution
  institutionAccounts: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await getInstitutionAccounts(ctx.userId, input.institutionId);
    }),

  // Get institution details
  get: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ input }) => {
      return await getInstitution(input.institutionId);
    }),

  // Get all available institutions
  list: protectedProcedure.query(async () => {
    return await getAllInstitutions();
  }),

  // Create a new institution (for manual accounts)
  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        url: z.string().url().optional(),
        logo: z.string().optional(),
        primaryColor: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createInstitution(input);
    }),

  // Link an account to an institution
  link: protectedProcedure
    .input(
      z.object({
        accountId: z.uuid(),
        institutionId: z.string().min(1, "Institution ID is required"),
        plaidItemId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { accountId, institutionId, plaidItemId } = input;

      // Ensure account exists and belongs to user
      const existingAccount = await getAccountById(accountId, ctx.userId);
      if (!existingAccount) {
        throw new Error("Account not found");
      }

      // Verify institution exists
      const institution = await getInstitutionById(institutionId);

      if (!institution) {
        throw new Error("Institution not found");
      }

      // If plaidItemId provided, verify it exists and belongs to user
      if (plaidItemId) {
        const plaidItem = await getUserPlaidItemForInstitution(
          plaidItemId,
          institutionId,
          ctx.userId
        );

        if (!plaidItem) {
          throw new Error(
            "Plaid item not found or does not belong to specified institution"
          );
        }
      }

      // Update account to link with institution
      const updatedAccount = await updateAccount(accountId, ctx.userId, {
        institutionId,
        plaidItemId: plaidItemId || null,
      });

      return {
        success: true,
        message: "Account successfully linked to institution",
        account: updatedAccount,
      };
    }),

  // Unlink an account from an institution
  unlink: protectedProcedure
    .input(z.object({ accountId: z.uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { accountId } = input;

      // Ensure account exists and belongs to user
      const existingAccount = await getAccountById(accountId, ctx.userId);
      if (!existingAccount) {
        throw new Error("Account not found");
      }

      // Update account to unlink from institution
      const updatedAccount = await updateAccount(accountId, ctx.userId, {
        institutionId: null,
        plaidItemId: null,
      });

      return {
        success: true,
        message: "Account successfully unlinked from institution",
        account: updatedAccount,
      };
    }),
});
