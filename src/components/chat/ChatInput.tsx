import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, ClipboardEvent } from 'react';
import { Send, Square, Paperclip, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { ChatFile } from '@/types/chat';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (content: string, files: ChatFile[]) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  supportsImages?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming, supportsImages }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<ChatFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Process pasted or selected files
  const processFiles = async (fileList: File[]): Promise<ChatFile[]> => {
    const processed: ChatFile[] = [];
    
    for (const file of fileList) {
      try {
        const chatFile = await new Promise<ChatFile>((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const content = reader.result as string;
            const base64Content = content.split(',')[1] || content;
            
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type,
              size: file.size,
              content: base64Content,
              url: content.startsWith('data:') ? content : `data:${file.type};base64,${base64Content}`,
            });
          };
          
          reader.onerror = () => reject(new Error('Failed to read file'));
          
          if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
          } else {
            reader.readAsText(file);
          }
        });
        
        processed.push(chatFile);
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        toast.error(`Failed to process ${file.name}`);
      }
    }
    
    return processed;
  };

  // Handle paste event
  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for images
      
      const imageFiles: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
      
      if (imageFiles.length > 0) {
        const processedFiles = await processFiles(imageFiles);
        setFiles(prev => [...prev, ...processedFiles]);
        toast.success(`Pasted ${processedFiles.length} image(s)`);
      }
    }
    // If not images, allow default text paste behavior
  };

  const handleSubmit = () => {
    if (isStreaming) return;
    
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) {
      toast.warning('Please enter a message or attach a file');
      return;
    }

    onSend(trimmedInput, files);
    setInput('');
    setFiles([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const processedFiles = await processFiles(selectedFiles);
    setFiles(prev => [...prev, ...processedFiles]);
    toast.success(`Added ${processedFiles.length} file(s)`);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="relative">
      {/* File attachments preview */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map(file => (
            <div
              key={file.id}
              className="group relative flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              {file.type.startsWith('image/') && (
                <div className="relative">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="absolute -top-1 -right-1">
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              {!file.type.startsWith('image/') && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input container  */}
      <div className="relative flex items-end gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isStreaming}
          className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach files"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.py,.java,.c,.cpp,.xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled || isStreaming}
            placeholder={isStreaming ? "AI is thinking..." : files.length > 0 ? "Add a message about your images..." : "Message Chat AI..."}
            rows={1}
            className="w-full resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed text-base leading-6 max-h-[200px] overflow-y-auto"
            style={{ minHeight: '24px' }}
          />
        </div>

        {/* Send/Stop button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex-shrink-0 p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm hover:shadow"
            title="Stop generating"
          >
            <Square className="w-5 h-5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || (!input.trim() && files.length === 0)}
            className="flex-shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-sm hover:shadow"
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hint text */}
      <div className="mt-2 px-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs">
              Enter
            </kbd>
            {' '}to send,{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs">
              Shift
            </kbd>
            {' '}+{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs">
              Enter
            </kbd>
            {' '}for new line
          </span>
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <ImageIcon className="w-3 h-3" />
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs">
              Ctrl
            </kbd>
            {' '}+{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs">
              V
            </kbd>
            {' '}to paste images
          </span>
        </div>
        {supportsImages && (
          <span className="text-green-600 dark:text-green-400">
            ✓ Vision enabled
          </span>
        )}
      </div>
    </div>
  );
}