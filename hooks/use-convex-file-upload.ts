import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export const useConvexFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const storeFileMetadata = useMutation(api.files.storeFileMetadata);

  const uploadFile = async (
    file: File,
    userId: string,
    assignmentId?: string
  ) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Get a pre-signed upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file directly to storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }

      // Get the storage ID from the upload response
      const { storageId } = await uploadResponse.json();

      // Store file metadata in Convex
      const fileId = await storeFileMetadata({
        userId,
        assignmentId: assignmentId ? assignmentId as any : undefined,
        fileId: storageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      setProgress(100);
      return { 
        fileId: storageId, // Return the storage ID for file retrieval
        metadataId: fileId, // Return the database metadata ID 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during file upload';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMultipleFiles = async (
    files: File[],
    userId: string,
    assignmentId?: string
  ) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    const results = [];
    const totalFiles = files.length;
    let completedFiles = 0;

    try {
      for (const file of files) {
        // Upload each file individually
        const result = await uploadFile(file, userId, assignmentId);
        results.push(result);

        // Update progress
        completedFiles++;
        setProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during multiple file upload';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading,
    progress,
    error,
  };
};
