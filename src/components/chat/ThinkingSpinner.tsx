import { Loader2, Sparkles } from 'lucide-react';

export function ThinkingSpinner() {
  return (
    <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* Thinking animation */}
      <div className="flex-1 flex items-center gap-3 pt-1">
        <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
        <div className="flex items-center gap-1.5">
          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
            AI is thinking
          </span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alternative pulse style
export function ThinkingPulse() {
  return (
    <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 space-y-2 pt-1">
        <div className="flex gap-2">
          <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>
          <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '200ms' }}></div>
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '250ms' }}></div>
        </div>
      </div>
    </div>
  );
}