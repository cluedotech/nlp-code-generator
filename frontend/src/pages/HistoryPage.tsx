import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import RequestHistory from '../components/RequestHistory';
import CodeDisplay from '../components/CodeDisplay';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { RequestHistory as RequestHistoryType } from '../types';

export default function HistoryPage() {
  const [selectedRequest, setSelectedRequest] = useState<RequestHistoryType | null>(null);
  const { showInfo } = useToast();
  const navigate = useNavigate();

  // Fetch request history
  const { data: requests = [], isLoading } = useQuery<RequestHistoryType[]>({
    queryKey: ['history'],
    queryFn: async () => {
      const response = await api.get('/history');
      return response.data;
    },
  });

  const handleSelectRequest = (request: RequestHistoryType) => {
    setSelectedRequest(request);
  };

  const handleResubmit = (request: RequestHistoryType) => {
    // Navigate to generator page with the request data
    // In a real implementation, we'd pass this data via state or context
    showInfo('Redirecting to generator with previous request...');
    navigate('/generator', { state: { resubmitRequest: request } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request History</h2>
        <p className="text-gray-600">
          View and resubmit your previous code generation requests
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* History List */}
        <div>
          <RequestHistory
            requests={requests}
            onSelectRequest={handleSelectRequest}
            onResubmit={handleResubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Selected Request Display */}
        <div>
          {selectedRequest ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Original Request</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedRequest.requestText}
                </p>
                <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                  <span>
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </span>
                  <span>•</span>
                  <span>{selectedRequest.processingTimeMs}ms</span>
                  {selectedRequest.tokensUsed && (
                    <>
                      <span>•</span>
                      <span>{selectedRequest.tokensUsed} tokens</span>
                    </>
                  )}
                </div>
              </div>
              <CodeDisplay
                code={selectedRequest.generatedCode}
                outputType={selectedRequest.outputType}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-gray-600">Select a request to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
