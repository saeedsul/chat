import { Settings, Trash2, Download, Moon, Sun, Palette } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { AIModel } from '@/types/chat';
import { useState, useEffect, useRef } from 'react';

interface ChatHeaderProps {
  models: AIModel[];
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  onClearChat: () => void;
  onExportChat: () => void;
}

export function ChatHeader({ 
  models, 
  selectedModel, 
  onSelectModel, 
  onClearChat,
  onExportChat 
}: ChatHeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSettings) {
        setShowSettings(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showSettings]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <div className="flex-1">
          <ModelSelector 
            models={models} 
            selectedModel={selectedModel} 
            onSelectModel={onSelectModel} 
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            onClick={onExportChat}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group relative"
            title="Export chat"
            aria-label="Export chat"
          >
            <Download className="w-5 h-5" />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Export Chat
            </span>
          </button>
          
          {/* Clear Button */}
          <button
            onClick={onClearChat}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors group relative"
            title="Clear chat"
            aria-label="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Clear Chat
            </span>
          </button>
          
          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`
                p-2 rounded-lg transition-colors group relative
                ${showSettings 
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
              title="Settings"
              aria-expanded={showSettings}
              aria-haspopup="menu"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Settings
              </span>
            </button>
            
            {/* Settings Dropdown Menu */}
            {showSettings && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden">
                <div className="p-3">
                  {/* Theme Toggle Section */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-3 px-2">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Appearance
                        </span>
                      </div>
                    </div>
                    
                    {/* Theme Options */}
                    <div className="grid grid-cols-2 gap-2 px-2">
                      <button
                        onClick={() => setIsDarkMode(false)}
                        className={`
                          flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                          ${!isDarkMode 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        <Sun className={`w-5 h-5 ${!isDarkMode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium ${!isDarkMode ? 'text-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          Light
                        </span>
                      </button>
                      
                      <button
                        onClick={() => setIsDarkMode(true)}
                        className={`
                          flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                          ${isDarkMode 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        <Moon className={`w-5 h-5 ${isDarkMode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          Dark
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-3" />
                  
                  {/* Export Chat */}
                  <button
                    onClick={() => {
                      onExportChat();
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-left mb-2"
                  >
                    <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Export Chat
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Download as JSON
                      </div>
                    </div>
                  </button>
                  
                  {/* Clear Chat */}
                  <button
                    onClick={() => {
                      onClearChat();
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Clear Chat
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Delete all messages
                      </div>
                    </div>
                  </button>
                  
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-3" />
                  
                  {/* Info Section */}
                  <div className="px-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Models run locally</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Current theme:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {isDarkMode ? 'Dark' : 'Light'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}