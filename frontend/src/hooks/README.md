# React Query Hooks Documentation

This directory contains React Query hooks for all API endpoints in the NLP Code Generator application.

## Features

- **Automatic caching**: Queries are cached and reused across components
- **Optimistic updates**: UI updates immediately before server confirmation
- **Cache invalidation**: Related queries are automatically refreshed
- **Error handling**: Built-in error states and retry logic
- **Type safety**: Full TypeScript support

## Authentication Hooks

### useLogin

```typescript
import { useLogin } from '../hooks';

const LoginComponent = () => {
  const login = useLogin();

  const handleLogin = async () => {
    try {
      const result = await login.mutateAsync({
        email: 'user@example.com',
        password: 'password123',
      });
      // Token and user are automatically stored
      console.log('Logged in:', result.user);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <button onClick={handleLogin} disabled={login.isPending}>
      {login.isPending ? 'Logging in...' : 'Login'}
    </button>
  );
};
```

### useRegister

```typescript
import { useRegister } from '../hooks';

const RegisterComponent = () => {
  const register = useRegister();

  const handleRegister = async () => {
    await register.mutateAsync({
      email: 'newuser@example.com',
      password: 'password123',
    });
  };

  return <button onClick={handleRegister}>Register</button>;
};
```

### useLogout

```typescript
import { useLogout } from '../hooks';

const LogoutButton = () => {
  const logout = useLogout();

  return (
    <button onClick={() => logout.mutate()}>
      Logout
    </button>
  );
};
```

## Generation Hooks

### useGenerateCode

```typescript
import { useGenerateCode } from '../hooks';

const GeneratorComponent = () => {
  const generateCode = useGenerateCode();

  const handleGenerate = async () => {
    try {
      const result = await generateCode.mutateAsync({
        request: 'Create a SQL query to get all users',
        outputType: 'sql',
        versionId: 'version-123',
      });
      console.log('Generated code:', result.generatedCode);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={generateCode.isPending}>
        Generate
      </button>
      {generateCode.isError && <p>Error: {generateCode.error.message}</p>}
    </div>
  );
};
```

## Version Management Hooks

### useVersions

```typescript
import { useVersions } from '../hooks';

const VersionSelector = () => {
  const { data: versions, isLoading, error } = useVersions();

  if (isLoading) return <div>Loading versions...</div>;
  if (error) return <div>Error loading versions</div>;

  return (
    <select>
      {versions?.map((version) => (
        <option key={version.id} value={version.id}>
          {version.name}
        </option>
      ))}
    </select>
  );
};
```

### useCreateVersion

```typescript
import { useCreateVersion } from '../hooks';

const CreateVersionForm = () => {
  const createVersion = useCreateVersion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVersion.mutateAsync({
      name: 'v2.0',
      description: 'New version',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createVersion.isPending}>
        Create Version
      </button>
    </form>
  );
};
```

## File Management Hooks

### useVersionFiles

```typescript
import { useVersionFiles } from '../hooks';

const FileList = ({ versionId }: { versionId: string }) => {
  const { data: files, isLoading } = useVersionFiles(versionId);

  if (isLoading) return <div>Loading files...</div>;

  return (
    <ul>
      {files?.map((file) => (
        <li key={file.id}>{file.filename}</li>
      ))}
    </ul>
  );
};
```

### useUploadDDL

```typescript
import { useUploadDDL } from '../hooks';

const DDLUploader = ({ versionId }: { versionId: string }) => {
  const uploadDDL = useUploadDDL();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadDDL.mutateAsync({ versionId, file });
      alert('DDL uploaded successfully!');
    } catch (error) {
      alert('Upload failed');
    }
  };

  return (
    <input
      type="file"
      onChange={handleFileChange}
      disabled={uploadDDL.isPending}
    />
  );
};
```

### useUploadDocs

```typescript
import { useUploadDocs } from '../hooks';

const DocsUploader = ({ versionId }: { versionId: string }) => {
  const uploadDocs = useUploadDocs();

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await uploadDocs.mutateAsync({ versionId, files });
  };

  return (
    <input
      type="file"
      multiple
      onChange={handleFilesChange}
      disabled={uploadDocs.isPending}
    />
  );
};
```

### useDeleteFile

```typescript
import { useDeleteFile } from '../hooks';

const FileItem = ({ fileId, filename }: { fileId: string; filename: string }) => {
  const deleteFile = useDeleteFile();

  const handleDelete = async () => {
    if (confirm(`Delete ${filename}?`)) {
      await deleteFile.mutateAsync(fileId);
    }
  };

  return (
    <div>
      <span>{filename}</span>
      <button onClick={handleDelete} disabled={deleteFile.isPending}>
        Delete
      </button>
    </div>
  );
};
```

## Request History Hooks

### useRequestHistory

```typescript
import { useRequestHistory } from '../hooks';

const HistoryList = () => {
  const { data: history, isLoading } = useRequestHistory({
    limit: 20,
    outputType: 'sql',
  });

  if (isLoading) return <div>Loading history...</div>;

  return (
    <ul>
      {history?.map((request) => (
        <li key={request.id}>
          {request.requestText} - {request.outputType}
        </li>
      ))}
    </ul>
  );
};
```

### useInfiniteRequestHistory

```typescript
import { useInfiniteRequestHistory } from '../hooks';

const InfiniteHistoryList = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRequestHistory({ limit: 20 });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.requests.map((request) => (
            <div key={request.id}>{request.requestText}</div>
          ))}
        </div>
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          Load More
        </button>
      )}
    </div>
  );
};
```

### useRequestDetail

```typescript
import { useRequestDetail } from '../hooks';

const RequestDetailView = ({ requestId }: { requestId: string }) => {
  const { data: request, isLoading } = useRequestDetail(requestId);

  if (isLoading) return <div>Loading...</div>;
  if (!request) return <div>Request not found</div>;

  return (
    <div>
      <h3>{request.requestText}</h3>
      <pre>{request.generatedCode}</pre>
    </div>
  );
};
```

### useResubmitRequest

```typescript
import { useResubmitRequest } from '../hooks';

const ResubmitButton = ({ requestId }: { requestId: string }) => {
  const resubmit = useResubmitRequest();

  const handleResubmit = async () => {
    await resubmit.mutateAsync({
      requestId,
      modifications: 'Add WHERE clause',
    });
  };

  return (
    <button onClick={handleResubmit} disabled={resubmit.isPending}>
      Resubmit
    </button>
  );
};
```

## Error Handling

All hooks automatically handle errors. You can access error states:

```typescript
const { data, error, isError } = useVersions();

if (isError) {
  console.error('Error:', error);
  return <div>Error: {error.message}</div>;
}
```

## Loading States

All hooks provide loading states:

```typescript
const { data, isLoading, isPending } = useVersions();

if (isLoading) {
  return <div>Loading...</div>;
}
```

## Optimistic Updates

Mutations automatically update the cache optimistically for better UX:

- Creating a version immediately adds it to the versions list
- Uploading a file immediately adds it to the files list
- Deleting a file immediately removes it from the list

The cache is then invalidated to ensure consistency with the server.

## Cache Invalidation

Related queries are automatically invalidated when mutations succeed:

- After generating code, request history is invalidated
- After uploading files, the version's file list is invalidated
- After creating a version, the versions list is invalidated

## Stale Time Configuration

Different queries have different stale times:

- Versions: 5 minutes (rarely change)
- Files: 2 minutes (change occasionally)
- History: 1 minute (changes frequently)

You can override these in individual components if needed.
