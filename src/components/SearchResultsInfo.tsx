'use client';

interface SearchResultsInfoProps {
  searchQuery: string;
  totalResults: number;
  totalCards: number;
  totalOthers: number;
}

export default function SearchResultsInfo({
  searchQuery,
  totalResults,
  totalCards,
  totalOthers
}: SearchResultsInfoProps) {
  if (!searchQuery.trim()) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <svg
          className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="text-sm text-blue-800 dark:text-blue-200">
          {totalResults === 0 ? (
            `No results found for "${searchQuery}"`
          ) : (
            <>
              Found <strong>{totalResults}</strong> result{totalResults !== 1 ? 's' : ''} for &quot;<strong>{searchQuery}</strong>&quot;
              {totalResults > 0 && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  ({totalCards} card{totalCards !== 1 ? 's' : ''}, {totalOthers} other item{totalOthers !== 1 ? 's' : ''})
                </span>
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}