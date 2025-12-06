import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, X, Square, Loader2, File, Copy, Check } from 'lucide-react';
import { ChatFile } from '@/types/chat';
import { FileDropZone } from './FileDropZone';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (message: string, files: ChatFile[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  supportsImages: boolean;
  onPaste?: (e: React.ClipboardEvent) => void;
}

// Supported file types
const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: ['application/pdf', 'text/plain', 'text/markdown', 'text/html', 'application/json', 'text/csv'],
  code: ['text/javascript', 'application/javascript', 'text/typescript', 'text/python', 'text/java', 'text/c', 'text/cpp', 'text/xml', 'application/xml']
};

export function ChatInput({ onSend, onStop, disabled, isStreaming, supportsImages, onPaste }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [showDropZone, setShowDropZone] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (onPaste) {
      onPaste(e);
      return;
    }

    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    let textContent = '';

    // Check for files
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          // Check if file is supported
          const type = file.type;
          const isSupported = 
            SUPPORTED_FILE_TYPES.images.includes(type) ||
            SUPPORTED_FILE_TYPES.documents.includes(type) ||
            SUPPORTED_FILE_TYPES.code.includes(type) ||
            type.startsWith('text/');

          if (isSupported) {
            pastedFiles.push(file);
          }
        }
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        item.getAsString(str => {
          textContent = str;
        });
      }
    }

    // If files were pasted, process them
    if (pastedFiles.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for files
      setIsProcessingFiles(true);
      
      try {
        const processedFiles: ChatFile[] = await Promise.all(
          pastedFiles.map(async (file) => {
            return await processFile(file);
          })
        );

        if (processedFiles.length > 0) {
          // Add files to existing files
          setFiles(prev => [...prev, ...processedFiles]);
          
          // Update message with file info if no text was pasted
          if (!textContent) {
            setMessage(prev => {
              const fileNames = processedFiles.map(f => f.name).join(', ');
              return prev 
                ? `${prev}\n[Pasted files: ${fileNames}]`
                : `[Pasted files: ${fileNames}]`;
            });
          }
          
          toast.success(`Pasted ${processedFiles.length} file(s) from clipboard`);
          
          // Show drop zone if not already shown
          if (!showDropZone) {
            setShowDropZone(true);
          }
        }
      } catch (error) {
        toast.error('Failed to process pasted files');
        console.error('Error processing pasted files:', error);
      } finally {
        setIsProcessingFiles(false);
      }
    }
  }, [onPaste, showDropZone]);

  // Process file function
  const processFile = async (file: File): Promise<ChatFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const content = reader.result as string;
        const base64Content = content.split(',')[1] || content;
        
        const chatFile: ChatFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: base64Content,
          url: content.startsWith('data:') ? content : `data:${file.type};base64,${base64Content}`,
        };
        
        resolve(chatFile);
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('text/') || 
                 SUPPORTED_FILE_TYPES.documents.includes(file.type) ||
                 SUPPORTED_FILE_TYPES.code.includes(file.type)) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  // Copy file to clipboard
  const copyFileToClipboard = useCallback(async (file: ChatFile) => {
    try {
      // For text files, copy the content
      if (file.type.startsWith('text/') || 
          SUPPORTED_FILE_TYPES.code.includes(file.type) ||
          SUPPORTED_FILE_TYPES.documents.includes(file.type)) {
        const content = atob(file.content);
        await navigator.clipboard.writeText(content);
        setCopiedFileId(file.id);
        toast.success(`Content of "${file.name}" copied to clipboard`);
      } else {
        // For images, copy as data URL
        const blob = await fetch(file.url).then(r => r.blob());
        const data = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([data]);
        setCopiedFileId(file.id);
        toast.success(`Image "${file.name}" copied to clipboard`);
      }
      
      // Reset copy indicator after 2 seconds
      setTimeout(() => {
        setCopiedFileId(null);
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy file');
    }
  }, []);

  // Remove a file
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && files.length === 0) return;
    
    onSend(message, files);
    setMessage('');
    setFiles([]);
    setShowDropZone(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, files, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSubmit(e);
      }
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    setShowDropZone(false);
    toast.info('All files cleared');
  }, []);

  // Effect to handle drag events on the component
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* File attachments preview */}
      {files.length > 0 && (
        <div className="mb-3 p-3 bg-background/50 backdrop-blur-sm rounded-xl border border-border animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <File className="w-4 h-4" />
              <span>Attached Files ({files.length})</span>
            </div>
            <button
              type="button"
              onClick={clearAllFiles}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {files.map(file => (
              <div
                key={file.id}
                className="group relative flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <File className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate max-w-[150px]">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => copyFileToClipboard(file)}
                    className="p-1 hover:bg-background/50 rounded transition-colors"
                    title="Copy file to clipboard"
                  >
                    {copiedFileId === file.id ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDropZone && files.length === 0 && (
        <div className="mb-3 animate-fade-in">
          <FileDropZone 
            files={files} 
            onFilesChange={setFiles} 
            supportsImages={supportsImages}
          />
        </div>
      )}

      <div 
        className="glass rounded-2xl overflow-hidden"
        onPaste={handlePaste}
      >
        <div className="flex items-end gap-2 p-3">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowDropZone(!showDropZone)}
              disabled={isStreaming || isProcessingFiles}
              className={cn(
                'flex-shrink-0 p-2 rounded-xl transition-colors relative',
                showDropZone || files.length > 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-secondary text-muted-foreground',
                (isStreaming || isProcessingFiles) && 'opacity-50 cursor-not-allowed'
              )}
              title={showDropZone ? "Close file upload" : "Attach files"}
            >
              {showDropZone && files.length === 0 ? (
                <X className="w-5 h-5" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
              {files.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {files.length}
                </span>
              )}
            </button>
            
            {isProcessingFiles && (
              <div className="text-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />
                <span className="text-xs text-muted-foreground">Processing...</span>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming 
              ? "AI is responding..." 
              : "Type your message... (You can also paste files here)"}
            disabled={disabled || isStreaming || isProcessingFiles}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground py-2 max-h-[200px] scrollbar-thin"
            onPaste={(e) => {
              // Let the form handle paste, but also allow normal text paste
              if (!e.clipboardData.items[0]?.type?.startsWith('text/plain')) {
                handlePaste(e);
              }
            }}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="flex-shrink-0 p-3 rounded-xl transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || isProcessingFiles || (!message.trim() && files.length === 0)}
              className={cn(
                'flex-shrink-0 p-3 rounded-xl transition-all relative',
                (message.trim() || files.length > 0)
                  ? 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
                (disabled || isProcessingFiles) && 'opacity-50 cursor-not-allowed'
              )}
              title={files.length > 0 ? `Send with ${files.length} file(s)` : "Send message"}
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Status indicators */}
   <div className="flex items-center justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
  <div className="flex items-center gap-2">
    {isStreaming && (
      <div className="flex items-center gap-2 animate-pulse text-blue-600 dark:text-blue-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>AI is thinking...</span>
      </div>
    )}
    {isProcessingFiles && (
      <div className="flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Processing files...</span>
      </div>
    )}
  </div>
  <div className="flex items-center gap-5">
    <div className="flex items-center gap-2">
      <kbd className="px-2.5 py-1.5 bg-blue-600 dark:bg-blue-500 text-white font-bold rounded-lg border border-blue-700 dark:border-blue-600 text-xs shadow-md">
        Enter
      </kbd>
      <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">to send</span>
    </div>

    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
    
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <kbd className="px-2 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-xs shadow-md">
          Shift
        </kbd>
        <span className="text-gray-500 dark:text-gray-400">+</span>
        <kbd className="px-2 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-xs shadow-md">
          Enter
        </kbd>
      </div>
      <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">new line</span>
    </div>
      
    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
    
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <kbd className="px-2 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-xs shadow-md">
          Ctrl
        </kbd>
        <span className="text-gray-500 dark:text-gray-400">+</span>
        <kbd className="px-2 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-xs shadow-md">
          V
        </kbd>
      </div>
      <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">to paste</span>
    </div>
  </div> 
</div>
    </form>
  );
}