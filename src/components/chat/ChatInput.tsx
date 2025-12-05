import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X, Square, Loader2 } from 'lucide-react';
import { ChatFile } from '@/types/chat';
import { FileDropZone } from './FileDropZone';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string, files: ChatFile[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  supportsImages: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming, supportsImages }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [showDropZone, setShowDropZone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && files.length === 0) return;
    
    onSend(message, files);
    setMessage('');
    setFiles([]);
    setShowDropZone(false);
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

  return (
    <form onSubmit={handleSubmit} className="relative">
      {showDropZone && (
        <div className="mb-3 animate-fade-in">
          <FileDropZone 
            files={files} 
            onFilesChange={setFiles} 
            supportsImages={supportsImages}
          />
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-end gap-2 p-3">
          <button
            type="button"
            onClick={() => setShowDropZone(!showDropZone)}
            disabled={isStreaming}
            className={cn(
              'flex-shrink-0 p-2 rounded-xl transition-colors',
              showDropZone || files.length > 0
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary text-muted-foreground',
              isStreaming && 'opacity-50 cursor-not-allowed'
            )}
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

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "AI is responding..." : "Type your message..."}
            disabled={disabled || isStreaming}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground py-2 max-h-[200px] scrollbar-thin"
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
              disabled={disabled || (!message.trim() && files.length === 0)}
              className={cn(
                'flex-shrink-0 p-3 rounded-xl transition-all',
                message.trim() || files.length > 0
                  ? 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {isStreaming && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>AI is thinking...</span>
        </div>
      )}
    </form>
  );
}
