import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import VersionManager from '../components/admin/VersionManager';
import FileUpload from '../components/admin/FileUpload';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { Version, FileMetadata } from '../types';

export default function AdminPage() {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  // Fetch versions
  const { data: versions = [], isLoading: versionsLoading } = useQuery<Version[]>({
    queryKey: ['versions'],
    queryFn: async () => {
      const response = await api.get('/versions');
      return response.data;
    },
  });

  // Fetch files for selected version
  const { data: files = [], isLoading: filesLoading } = useQuery<FileMetadata[]>({
    queryKey: ['files', selectedVersionId],
    queryFn: async () => {
      if (!selectedVersionId) return [];
      const response = await api.get(`/versions/${selectedVersionId}/files`);
      // API returns { versionId, files, count }, extract the files array
      return response.data.files || [];
    },
    enabled: !!selectedVersionId,
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const response = await api.post('/versions', { name, description });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      setSelectedVersionId(data.id);
      showSuccess(`Version "${data.name}" created successfully`);
    },
    onError: () => {
      showError('Failed to create version');
    },
  });

  // Upload DDL mutation
  const uploadDDLMutation = useMutation({
    mutationFn: async ({ versionId, files }: { versionId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await api.post(`/versions/${versionId}/ddl`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', selectedVersionId] });
      showSuccess('DDL file uploaded successfully');
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to upload DDL file';
      showError(message);
    },
  });

  // Upload docs mutation
  const uploadDocsMutation = useMutation({
    mutationFn: async ({ versionId, files }: { versionId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await api.post(`/versions/${versionId}/docs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', selectedVersionId] });
      showSuccess('Supporting documents uploaded successfully');
    },
    onError: () => {
      showError('Failed to upload supporting documents');
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', selectedVersionId] });
      showSuccess('File deleted successfully');
    },
    onError: () => {
      showError('Failed to delete file');
    },
  });

  const handleCreateVersion = async (name: string, description: string) => {
    await createVersionMutation.mutateAsync({ name, description });
  };

  const handleUploadDDL = async (files: File[]) => {
    if (!selectedVersionId) return;
    await uploadDDLMutation.mutateAsync({ versionId: selectedVersionId, files });
  };

  const handleUploadDocs = async (files: File[]) => {
    if (!selectedVersionId) return;
    await uploadDocsMutation.mutateAsync({ versionId: selectedVersionId, files });
  };

  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      await deleteFileMutation.mutateAsync(fileId);
    }
  };

  const ddlFiles = files.filter(f => f.fileType === 'ddl');
  const supportingDocs = files.filter(f => f.fileType === 'supporting_doc');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel</h2>
        <p className="text-gray-600">
          Manage software versions and upload DDL files and supporting documentation
        </p>
      </div>

      {/* Version Manager */}
      <VersionManager
        versions={versions}
        onCreateVersion={handleCreateVersion}
        onSelectVersion={setSelectedVersionId}
        selectedVersionId={selectedVersionId}
        isLoading={versionsLoading}
      />

      {/* File Upload Sections */}
      {selectedVersionId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DDL Files */}
          <FileUpload
            versionId={selectedVersionId}
            fileType="ddl"
            onUpload={handleUploadDDL}
            files={ddlFiles}
            onDeleteFile={handleDeleteFile}
            isLoading={filesLoading}
          />

          {/* Supporting Documents */}
          <FileUpload
            versionId={selectedVersionId}
            fileType="supporting_doc"
            onUpload={handleUploadDocs}
            files={supportingDocs}
            onDeleteFile={handleDeleteFile}
            isLoading={filesLoading}
          />
        </div>
      )}
    </div>
  );
}
