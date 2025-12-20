import type { UseMutationOptions } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { trpc } from "./trpc/client";
import type { AppRouter } from "./trpc/router";

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export const useCreateList = (
  options?: UseMutationOptions<
    RouterOutputs["lists"]["create"],
    unknown,
    RouterInputs["lists"]["create"]
  >
) => {
  const utils = trpc.useUtils();

  return trpc.lists.create.useMutation({
    ...options,
    onSuccess: (newList, variables, context, mutation) => {
      utils.lists.getAll.invalidate();

      utils.lists.getAll.setData(undefined, (oldLists = []) => {
        return [...oldLists, newList];
      });

      options?.onSuccess?.(newList, variables, context, mutation);
    },
  });
};

export const useUpdateList = (
  options?: UseMutationOptions<
    RouterOutputs["lists"]["update"],
    unknown,
    RouterInputs["lists"]["update"]
  >
) => {
  const utils = trpc.useUtils();

  return trpc.lists.update.useMutation({
    ...options,
    onSuccess: (updatedList, variables, context, mutation) => {
      utils.lists.getById.setData({ id: updatedList.id }, (old) => {
        if (!old) return old;
        return {
          ...old,
          ...updatedList,
          description: updatedList.description ?? old.description,
        };
      });

      utils.lists.getAll.setData(undefined, (oldLists = []) => {
        return oldLists.map((list) => {
          if (list.id === updatedList.id) {
            const description: string =
              updatedList.description ?? list.description ?? "";
            return {
              ...list,
              name: updatedList.name,
              description,
              isPublic: updatedList.isPublic ?? list.isPublic,
              updatedAt: updatedList.updatedAt,
            };
          }
          return list;
        });
      });

      options?.onSuccess?.(updatedList, variables, context, mutation);
    },
  });
};

export const useDeleteList = (
  options?: UseMutationOptions<
    RouterOutputs["lists"]["delete"],
    unknown,
    RouterInputs["lists"]["delete"]
  >
) => {
  const utils = trpc.useUtils();

  return trpc.lists.delete.useMutation({
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      utils.lists.getAll.setData(undefined, (oldLists = []) => {
        return oldLists.filter((list) => list.id !== variables.id);
      });
      utils.lists.getAll.invalidate();

      options?.onSuccess?.(data, variables, context, mutation);
    },
  });
};
