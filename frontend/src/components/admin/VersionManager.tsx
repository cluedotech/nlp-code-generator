import { useState } from 'react';
import { Version } from '../../types';

interface VersionManagerProps {
  versions: Version[];
  onCreateVersion: (name: string, description: string) => Promise<void>;
  onSelectVersion: (versionId: string) => void;
  selectedVersionId: string | null;
  isLoading?: boolean;
}

export default function VersionManager({
  versions,
  onCreateVersion,
  onSelectVersion,
  selectedVersionId,
  isLoading = false,
}: VersionManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateVersion(newVersionName, newVersionDescription);
      setNewVersionName('');
      setNewVersionDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create version:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Version Management</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Version
          </button>
        </div>
      </div>

      {/* Create Version Form */}
      {showCreateForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="versionName" className="block text-sm font-medium text-gray-700 mb-1">
                Version Name
              </label>
              <input
                type="text"
                id="versionName"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., v1.0.0"
                required
                disabled={isCreating}
              />
            </div>
            <div>
              <label htmlFor="versionDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="versionDescription"
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
                disabled={isCreating}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isCreating || !newVersionName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
                className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Version List */}
      <div className="divide-y divide-gray-200">
        {isLoading ? (
          <div className="px-6 py-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-600">No versions created yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first version to get started</p>
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              onClick={() => onSelectVersion(version.id)}
              className={`px-6 py-4 cursor-pointer transition-colors ${
                selectedVersionId === version.id
                  ? 'bg-blue-50 border-l-4 border-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{version.name}</h4>
                  {version.description && (
                    <p className="text-sm text-gray-600 mt-1">{version.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Created {new Date(version.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedVersionId === version.id && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Selected
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
