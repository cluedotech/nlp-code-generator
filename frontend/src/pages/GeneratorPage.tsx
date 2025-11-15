import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import RequestInput from '../components/RequestInput';
import CodeDisplay from '../components/CodeDisplay';
import ErrorMessage from '../components/ErrorMessage';
import ClarificationPrompt from '../components/ClarificationPrompt';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { Version, GenerationRequest, GenerationResult, OutputType, ErrorResponse } from '../types';

export default function GeneratorPage() {
  const [selectedVersion, setSelectedVersion] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [currentOutputType, setCurrentOutputType] = useState<OutputType>('sql');
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [clarificationNeeded, setClarificationNeeded] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  // Fetch available versions
  const { data: versions = [], isLoading: versionsLoading } = useQuery<Version[]>({
    queryKey: ['versions'],
    queryFn: async () => {
      const response = await api.get('/versions');
      return response.data;
    },
  });

  // Generate code mutation
  const generateMutation = useMutation({
    mutationFn: async (request: GenerationRequest) => {
      const response = await api.post<GenerationResult>('/generate', request);
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedCode(data.generatedCode);
      setError(null);
      setClarificationNeeded(null);
      showSuccess('Code generated successfully!');
    },
    onError: (err: any) => {
      const errorData = err.response?.data as ErrorResponse;
      
      // Check if it's a clarification request
      if (errorData?.error?.code === 'CLARIFICATION_NEEDED') {
        setClarificationNeeded(errorData.error.message);
      } else {
        setError(errorData || { error: { code: 'ERROR', message: 'Failed to generate code' } });
        showError('Failed to generate code');
      }
    },
  });

  const handleSubmit = (request: string, outputType: OutputType, versionId: string) => {
    setCurrentOutputType(outputType);
    setError(null);
    setClarificationNeeded(null);
    generateMutation.mutate({ request, outputType, versionId });
  };

  const handleClarificationResponse = (_response: string) => {
    // In a real implementation, this would append the clarification to the original request
    // and resubmit. For now, we'll just show a message.
    showError('Clarification handling not yet implemented in backend');
    setClarificationNeeded(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Code Generator</h2>
        <p className="text-gray-600">
          Generate SQL queries, n8n workflows, or Form.io forms using natural language
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorMessage 
          error={error} 
          onDismiss={() => setError(null)} 
        />
      )}

      {/* Clarification Prompt */}
      {clarificationNeeded && (
        <ClarificationPrompt
          message={clarificationNeeded}
          onRespond={handleClarificationResponse}
          onCancel={() => setClarificationNeeded(null)}
        />
      )}

      {/* Request Input */}
      <RequestInput
        onSubmit={handleSubmit}
        availableVersions={versions}
        selectedVersion={selectedVersion}
        onVersionChange={setSelectedVersion}
        isLoading={generateMutation.isPending || versionsLoading}
      />

      {/* Code Display */}
      <CodeDisplay
        code={generatedCode}
        outputType={currentOutputType}
        isLoading={generateMutation.isPending}
      />
    </div>
  );
}
