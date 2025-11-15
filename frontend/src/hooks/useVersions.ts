import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Version } from '../types';

interface CreateVersionRequest {
  name: string;
  description: string;
}

// Fetch all versions
export const useVersions = () => {
  return useQuery({
    queryKey: ['versions'],
    queryFn: async (): Promise<Version[]> => {
      const response = await api.get('/versions');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
};

// Fetch single version
export const useVersion = (versionId: string | undefined) => {
  return useQuery({
    queryKey: ['versions', versionId],
    queryFn: async (): Promise<Version> => {
      const response = await api.get(`/versions/${versionId}`);
      return response.data;
    },
    enabled: !!versionId,
  });
};

// Create version mutation
export const useCreateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVersionRequest): Promise<Version> => {
      const response = await api.post('/versions', data);
      return response.data;
    },
    onSuccess: (newVersion) => {
      // Optimistically update the versions list
      queryClient.setQueryData<Version[]>(['versions'], (old) => {
        return old ? [...old, newVersion] : [newVersion];
      });
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
};

// Delete version mutation
export const useDeleteVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string): Promise<void> => {
      await api.delete(`/versions/${versionId}`);
    },
    onSuccess: (_, versionId) => {
      // Optimistically remove from cache
      queryClient.setQueryData<Version[]>(['versions'], (old) => {
        return old ? old.filter((v) => v.id !== versionId) : [];
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      queryClient.invalidateQueries({ queryKey: ['files', versionId] });
    },
  });
};
