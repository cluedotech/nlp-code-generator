import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { GenerationRequest, GenerationResult } from '../types';

// Generate code mutation
export const useGenerateCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GenerationRequest): Promise<GenerationResult> => {
      const response = await api.post('/generate', request);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate request history to show the new request
      queryClient.invalidateQueries({ queryKey: ['requestHistory'] });
    },
  });
};
