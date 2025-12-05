import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react';
import { ChatFile } from '@/types/chat';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  files: ChatFile[];
  onFilesChange: (files: ChatFile[]) => void;
  supportsImages: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];

export function FileDropZone({ files, onFilesChange, supportsImages }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File): Promise<ChatFile | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`File type ${file.type} is not supported`);
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit');
      return null;
    }

    const chatFile: ChatFile = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
    };

    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          chatFile.preview = e.target?.result as string;
          resolve(chatFile);
        };
        reader.readAsDataURL(file);
      });
    }

    return chatFile;
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const processedFiles = await Promise.all(droppedFiles.map(processFile));
    const validFiles = processedFiles.filter((f): f is ChatFile => f !== null);
    
    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, onFilesChange, processFile]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    const processedFiles = await Promise.all(selectedFiles.map(processFile));
    const validFiles = processedFiles.filter((f): f is ChatFile => f !== null);
    
    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, onFilesChange, processFile]);

  const removeFile = useCallback((id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  }, [files, onFilesChange]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        const processed = await processFile(file);
        if (processed) {
          onFilesChange([...files, processed]);
        }
      }
    }
  }, [files, onFilesChange, processFile]);

  if (files.length > 0) {
    return (
      <div className="flex flex-wrap gap-2 p-3 glass rounded-xl mb-2">
        {files.map((file) => (
          <div key={file.id} className="relative group animate-fade-in">
            <div className="flex items-center gap-2 bg-secondary rounded-lg p-2">
              {file.type.startsWith('image/') && file.preview ? (
                <img src={file.preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
              ) : file.type.startsWith('image/') ? (
                <ImageIcon className="w-6 h-6 text-primary" />
              ) : (
                <FileText className="w-6 h-6 text-primary" />
              )}
              <div className="max-w-[100px]">
                <div className="text-xs font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)}KB
                </div>
              </div>
            </div>
            <button
              onClick={() => removeFile(file.id)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {!supportsImages && files.some(f => f.type.startsWith('image/')) && (
          <div className="flex items-center gap-2 text-amber-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            Current model doesn't support images
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-2 animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={cn(
          'border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300',
          isDragging 
            ? 'drop-zone-active border-primary' 
            : 'border-border/50 hover:border-primary/50'
        )}
      >
        <input
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <Upload className={cn(
            'w-8 h-8 mx-auto mb-2 transition-colors',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )} />
          <div className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-muted-foreground/70 mt-1">
            Images, PDFs, and text files up to 10MB
          </div>
        </label>
      </div>
    </>
  );
}
