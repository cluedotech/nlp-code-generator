import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { RequestHistory, OutputType } from '../types';

interface HistoryFilters {
  outputType?: OutputType;
  versionId?: string;
  limit?: number;
  offset?: number;
}

interface HistoryResponse {
  requests: RequestHistory[];
  total: number;
  hasMore: boolean;
}

// Fetch request history with pagination
export const useRequestHistory = (filters?: HistoryFilters) => {
  return useQuery({
    queryKey: ['requestHistory', filters],
    queryFn: async (): Promise<RequestHistory[]> => {
      const params = new URLSearchParams();
      if (filters?.outputType) params.append('outputType', filters.outputType);
      if (filters?.versionId) params.append('versionId', filters.versionId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await api.get(`/history?${params.toString()}`);
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
  });
};

// Fetch request history with infinite scroll
export const useInfiniteRequestHistory = (filters?: Omit<HistoryFilters, 'offset'>) => {
  const limit = filters?.limit || 20;

  return useInfiniteQuery({
    queryKey: ['requestHistory', 'infinite', filters],
    queryFn: async ({ pageParam = 0 }): Promise<HistoryResponse> => {
      const params = new URLSearchParams();
      if (filters?.outputType) params.append('outputType', filters.outputType);
      if (filters?.versionId) params.append('versionId', filters.versionId);
      params.append('limit', limit.toString());
      params.append('offset', pageParam.toString());

      const response = await api.get(`/history?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * limit;
    },
    initialPageParam: 0,
    staleTime: 1 * 60 * 1000,
  });
};

// Fetch single request
export const useRequestDetail = (requestId: string | undefined) => {
  return useQuery({
    queryKey: ['requestHistory', requestId],
    queryFn: async (): Promise<RequestHistory> => {
      const response = await api.get(`/history/${requestId}`);
      return response.data;
    },
    enabled: !!requestId,
  });
};

// Resubmit request mutation
export const useResubmitRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      modifications,
    }: {
      requestId: string;
      modifications?: string;
    }): Promise<RequestHistory> => {
      const response = await api.post(`/history/${requestId}/resubmit`, {
        modifications,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate history to show the new request
      queryClient.invalidateQueries({ queryKey: ['requestHistory'] });
    },
  });
};
