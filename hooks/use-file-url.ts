import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export const useFileUrl = (storageId: string | undefined, userId: string) => {
  return useQuery(
    api.files.getFileUrlByStorageId,
    storageId ? { storageId: storageId as Id<"_storage">, userId } : "skip"
  );
};
