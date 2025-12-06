import { Sparkles } from 'lucide-react';

export function WelcomeScreen() {
 

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-950">
      <div className="max-w-4xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            How can I help you today?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            I'm powered by Llama 3.2 and ready to assist with your tasks
          </p>
        </div> 

        {/* Footer info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Start a conversation by typing a message below
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              All models ready
            </span>
            <span>•</span>
            <span>Vision enabled</span>
            <span>•</span>
            <span>Code execution available</span>
          </div>
        </div>
      </div>
    </div>
  );
}