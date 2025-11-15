import { ErrorResponse } from '../types';

interface ErrorMessageProps {
  error: ErrorResponse | string | null;
  onDismiss?: () => void;
}

export default function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
  if (!error) return null;

  const errorData = typeof error === 'string' 
    ? { error: { code: 'ERROR', message: error } }
    : error;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {errorData.error.code !== 'ERROR' && `${errorData.error.code}: `}
            {errorData.error.message}
          </h3>
          
          {errorData.error.details && (
            <div className="mt-2 text-sm text-red-700">
              <pre className="whitespace-pre-wrap font-mono text-xs bg-red-100 p-2 rounded">
                {JSON.stringify(errorData.error.details, null, 2)}
              </pre>
            </div>
          )}
          
          {errorData.error.suggestions && errorData.error.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-800 mb-1">Suggestions:</p>
              <ul className="list-disc list-inside space-y-1">
                {errorData.error.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-red-700">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="inline-flex text-red-400 hover:text-red-600 focus:outline-none"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
