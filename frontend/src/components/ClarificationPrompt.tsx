interface ClarificationPromptProps {
  message: string;
  onRespond: (response: string) => void;
  onCancel: () => void;
}

export default function ClarificationPrompt({ message, onRespond, onCancel }: ClarificationPromptProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const response = formData.get('clarification') as string;
    if (response.trim()) {
      onRespond(response);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Clarification Needed
          </h3>
          <p className="text-sm text-yellow-700 mb-4">{message}</p>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              name="clarification"
              rows={3}
              className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              placeholder="Provide additional details..."
              required
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
