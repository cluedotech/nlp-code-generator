import { useState } from 'react';
import { RequestHistory as RequestHistoryType, OutputType } from '../types';

interface RequestHistoryProps {
  requests: RequestHistoryType[];
  onSelectRequest: (request: RequestHistoryType) => void;
  onResubmit: (request: RequestHistoryType) => void;
  isLoading?: boolean;
}

export default function RequestHistory({
  requests,
  onSelectRequest,
  onResubmit,
  isLoading = false,
}: RequestHistoryProps) {
  const [filterOutputType, setFilterOutputType] = useState<OutputType | 'all'>('all');
  const [filterVersion, setFilterVersion] = useState<string>('all');

  // Get unique versions from requests
  const uniqueVersions = Array.from(new Set(requests.map(r => r.versionId)));

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesType = filterOutputType === 'all' || request.outputType === filterOutputType;
    const matchesVersion = filterVersion === 'all' || request.versionId === filterVersion;
    return matchesType && matchesVersion;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getOutputTypeColor = (type: OutputType) => {
    switch (type) {
      case 'sql':
        return 'bg-blue-100 text-blue-800';
      case 'n8n':
        return 'bg-purple-100 text-purple-800';
      case 'formio':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              id="filterType"
              value={filterOutputType}
              onChange={(e) => setFilterOutputType(e.target.value as OutputType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="sql">SQL</option>
              <option value="n8n">n8n</option>
              <option value="formio">Form.io</option>
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="filterVersion" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Version
            </label>
            <select
              id="filterVersion"
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Versions</option>
              {uniqueVersions.map(versionId => (
                <option key={versionId} value={versionId}>
                  {versionId}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="divide-y divide-gray-200">
        {filteredRequests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600">No requests found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or make a new request</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onSelectRequest(request)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getOutputTypeColor(request.outputType)}`}>
                      {request.outputType.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                    {request.requestText}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      <svg className="inline h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {request.processingTimeMs}ms
                    </span>
                    {request.tokensUsed && (
                      <span>
                        <svg className="inline h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {request.tokensUsed} tokens
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResubmit(request);
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Resubmit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
