import { useState } from 'react';
import { OutputType, Version } from '../types';

interface RequestInputProps {
  onSubmit: (request: string, outputType: OutputType, versionId: string) => void;
  availableVersions: Version[];
  selectedVersion: string;
  onVersionChange: (versionId: string) => void;
  isLoading?: boolean;
}

export default function RequestInput({
  onSubmit,
  availableVersions,
  selectedVersion,
  onVersionChange,
  isLoading = false,
}: RequestInputProps) {
  const [request, setRequest] = useState('');
  const [outputType, setOutputType] = useState<OutputType>('sql');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (request.trim() && selectedVersion) {
      onSubmit(request, outputType, selectedVersion);
    }
  };

  const selectedVersionName = availableVersions.find(v => v.id === selectedVersion)?.name || 'None';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Version Selector */}
        <div>
          <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
            Software Version
          </label>
          <select
            id="version"
            value={selectedVersion}
            onChange={(e) => onVersionChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
          >
            <option value="">Select a version</option>
            {availableVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.name}
              </option>
            ))}
          </select>
          {selectedVersion && (
            <p className="mt-2 text-sm text-gray-600">
              Currently selected: <span className="font-semibold text-blue-600">{selectedVersionName}</span>
            </p>
          )}
        </div>

        {/* Output Type Selector */}
        <div>
          <label htmlFor="outputType" className="block text-sm font-medium text-gray-700 mb-2">
            Output Type
          </label>
          <select
            id="outputType"
            value={outputType}
            onChange={(e) => setOutputType(e.target.value as OutputType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="sql">SQL Query</option>
            <option value="n8n">n8n Workflow</option>
            <option value="formio">Form.io Form</option>
          </select>
        </div>

        {/* Natural Language Input */}
        <div>
          <label htmlFor="request" className="block text-sm font-medium text-gray-700 mb-2">
            Describe what you want to generate
          </label>
          <textarea
            id="request"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Example: Create a SQL query to get all users who registered in the last 30 days..."
            disabled={isLoading}
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            Describe your request in natural language. Be as specific as possible.
          </p>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading || !request.trim() || !selectedVersion}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Code'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
