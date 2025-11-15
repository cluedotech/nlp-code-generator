import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { FileMetadata } from '../types';

// Fetch files for a version
export const useVersionFiles = (versionId: string | undefined) => {
  return useQuery({
    queryKey: ['files', versionId],
    queryFn: async (): Promise<FileMetadata[]> => {
      const response = await api.get(`/versions/${versionId}/files`);
      // API returns { versionId, files, count }, we need just the files array
      return response.data.files || [];
    },
    enabled: !!versionId,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
};

// Upload DDL file mutation
export const useUploadDDL = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      versionId,
      file,
    }: {
      versionId: string;
      file: File;
    }): Promise<FileMetadata> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/versions/${versionId}/ddl`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // API returns { message, file }, we need just the file
      return response.data.file;
    },
    onSuccess: (newFile, { versionId }) => {
      // Optimistically update the files list
      queryClient.setQueryData<FileMetadata[]>(['files', versionId], (old) => {
        return old ? [...old, newFile] : [newFile];
      });
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['files', versionId] });
    },
  });
};

// Upload supporting documents mutation
export const useUploadDocs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      versionId,
      files,
    }: {
      versionId: string;
      files: File[];
    }): Promise<FileMetadata[]> => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await api.post(`/versions/${versionId}/docs`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // API returns { message, files, errors }, we need just the files array
      return response.data.files || [];
    },
    onSuccess: (newFiles, { versionId }) => {
      // Optimistically update the files list
      queryClient.setQueryData<FileMetadata[]>(['files', versionId], (old) => {
        return old ? [...old, ...newFiles] : newFiles;
      });
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['files', versionId] });
    },
  });
};

// Delete file mutation
export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string): Promise<void> => {
      await api.delete(`/files/${fileId}`);
    },
    onSuccess: (_, fileId) => {
      // Optimistically remove from all file caches
      queryClient.setQueriesData<FileMetadata[]>(
        { queryKey: ['files'] },
        (old) => {
          return old ? old.filter((f) => f.id !== fileId) : [];
        }
      );
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};
