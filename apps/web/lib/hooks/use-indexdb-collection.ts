import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Item {
  id: string;
}

interface UseIndexedDBCollectionOptions<T extends Item> {
  collectionKey: string;
  dbName?: string;
  version?: number;
  initialData?: T[];
}

interface DBInstance {
  db: IDBDatabase | null;
  isInitialized: boolean;
}

export const useIndexedDBCollection = <T extends Item>({
  collectionKey,
  dbName = 'AppDatabase',
  version = 1,
  initialData = [],
}: UseIndexedDBCollectionOptions<T>) => {
  const queryClient = useQueryClient();
  const dbInstance: DBInstance = { db: null, isInitialized: false };

  // Initialize IndexedDB
  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (dbInstance.isInitialized && dbInstance.db) {
        resolve(dbInstance.db);
        return;
      }

      const request = indexedDB.open(dbName, version);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        dbInstance.db = request.result;
        dbInstance.isInitialized = true;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(collectionKey)) {
          db.createObjectStore(collectionKey, { keyPath: 'id' });
        }
      };
    });
  };

  // Helper function for database operations
  const dbOperation = <R>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<R>
  ): Promise<R> => {
    return new Promise((resolve, reject) => {
      initDB()
        .then((db) => {
          const transaction = db.transaction(collectionKey, mode);
          const store = transaction.objectStore(collectionKey);
          const request = operation(store);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        })
        .catch(reject);
    });
  };

  // Get all items from the collection
  const getAll = async (): Promise<T[]> => {
    try {
      return await dbOperation('readonly', (store) => store.getAll());
    } catch (error) {
      console.error('Error reading from IndexedDB:', error);
      return initialData;
    }
  };

  // Query for fetching all items
  const { data: items = [], isLoading } = useQuery({
    queryKey: [collectionKey],
    queryFn: getAll,
  });

  // Mutation for creating items
  const createMutation = useMutation({
    mutationFn: async (newItem: Omit<T, 'id'>) => {
      const item = {
        ...newItem,
        id: crypto.randomUUID(),
      } as T;
      
      await dbOperation('readwrite', (store) => store.add(item));
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionKey] });
    },
  });

  // Mutation for updating items
  const updateMutation = useMutation({
    mutationFn: async (updatedItem: T) => {
      await dbOperation('readwrite', (store) => store.put(updatedItem));
      return updatedItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionKey] });
    },
  });

  // Mutation for deleting items
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await dbOperation('readwrite', (store) => store.delete(id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionKey] });
    },
  });

  // Export all data
  const exportData = async (): Promise<string> => {
    try {
      const allData = await getAll();
      const exportObject = {
        collectionKey,
        timestamp: new Date().toISOString(),
        data: allData,
      };
      return JSON.stringify(exportObject, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  };

  // Import data
  const importMutation = useMutation({
    mutationFn: async (importData: T[]) => {
      await dbOperation('readwrite', (store) => {
        // Clear existing data
        store.clear();

        // Add all imported items
        for (const item of importData) {
          store.add(item);
        }

        return store.count();
      });
      return importData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionKey] });
    },
  });

  return {
    items,
    isLoading,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    createAsync: createMutation.mutateAsync,
    updateAsync: updateMutation.mutateAsync,
    deleteAsync: deleteMutation.mutateAsync,
    import: importMutation.mutate,
    importAsync: importMutation.mutateAsync,
    exportData,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isImporting: importMutation.isPending,
  };
};
