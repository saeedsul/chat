import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, ClipboardEvent } from 'react';
import { Send, Square, Paperclip, X, Image as ImageIcon, FileText, AlertCircle, Loader2, Download, Maximize2 } from 'lucide-react';
import { ChatFile } from '@/types/chat';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (content: string, files: ChatFile[]) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  supportsImages?: boolean;
}

// Maximum file size (increased to 5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ChatInput({ onSend, onStop, disabled, isStreaming, supportsImages }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [showConvertBanner, setShowConvertBanner] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Detect filename from text content
  const detectFileNameFromText = (text: string): string => {
    // Try to detect React component name
    const componentMatch = text.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
    if (componentMatch) {
      return `${componentMatch[1]}.jsx`;
    }
    
    // Try to detect file extension from content
    if (text.includes('import React') || text.includes('from \'react\'')) {
      return `react_component_${Date.now()}.jsx`;
    }
    if (text.includes('interface ') || text.includes('type ') || text.includes(': string') || text.includes(': number')) {
      return `component_${Date.now()}.tsx`;
    }
    if (text.includes('def ') || text.includes('import ') || text.includes('print(')) {
      return `script_${Date.now()}.py`;
    }
    if (text.includes('#include') || text.includes('int main')) {
      return `program_${Date.now()}.c`;
    }
    if (text.includes('public class') || text.includes('import java.')) {
      return `JavaClass_${Date.now()}.java`;
    }
    if (text.includes('<html') || text.includes('<!DOCTYPE')) {
      return `document_${Date.now()}.html`;
    }
    if (text.includes('SELECT ') || text.includes('FROM ') || text.includes('WHERE ')) {
      return `query_${Date.now()}.sql`;
    }
    
    // Default naming
    const firstLine = text.split('\n')[0].substring(0, 30).replace(/[^\w\s]/g, '');
    return `${firstLine || 'document'}_${Date.now()}.txt`;
  };

  // Detect file type from text content
  const detectFileTypeFromText = (text: string): string => {
    if (text.includes('import React') || text.includes('from \'react\'') || 
        text.includes('jsx') || text.includes('</') || text.includes('className=')) {
      return 'text/javascript';
    }
    if (text.includes('interface ') || text.includes(': string') || text.includes(': number') || 
        text.includes('type ') && text.includes('= {') || text.includes('as const')) {
      return 'text/typescript';
    }
    if (text.includes('def ') || text.includes('import ') || text.includes('print(') || text.includes('__main__')) {
      return 'text/python';
    }
    if (text.includes('#include') || text.includes('int main') || text.includes('printf(')) {
      return 'text/x-c';
    }
    if (text.includes('public class') || text.includes('import java.') || text.includes('System.out')) {
      return 'text/x-java';
    }
    if (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<div ') || text.includes('</div>')) {
      return 'text/html';
    }
    if (text.includes('SELECT ') || text.includes('FROM ') || text.includes('WHERE ')) {
      return 'text/sql';
    }
    
    return 'text/plain';
  };

  // Simplified file processing
  const processFileToBase64 = (file: File): Promise<ChatFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const result = event.target?.result;
          if (!result) {
            reject(new Error('Failed to read file'));
            return;
          }

          let base64Content: string;
          let url: string;

          if (typeof result === 'string') {
            // Data URL
            base64Content = result.split(',')[1] || result;
            url = result;
          } else {
            // ArrayBuffer
            const bytes = new Uint8Array(result as ArrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            base64Content = btoa(binary);
            url = `data:${file.type};base64,${base64Content}`;
          }

          const chatFile: ChatFile = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content,
            url: url,
          };

          resolve(chatFile);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      
      // Use appropriate reader method
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('text/') || 
                 file.type.includes('json') || 
                 file.type.includes('xml') ||
                 file.type.includes('javascript')) {
        // For text files, read as text and encode properly
        const textReader = new FileReader();
        textReader.onload = (e) => {
          const text = e.target?.result as string;
          // Proper UTF-8 encoding
          const base64 = btoa(unescape(encodeURIComponent(text)));
          const chatFile: ChatFile = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64,
            url: `data:${file.type};base64,${base64}`,
          };
          resolve(chatFile);
        };
        textReader.readAsText(file, 'UTF-8');
      } else {
        // For binary files
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Process multiple files
  const processFiles = async (fileList: File[]): Promise<ChatFile[]> => {
    setIsProcessing(true);
    const processedFiles: ChatFile[] = [];
    
    for (const file of fileList) {
      try {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
          continue;
        } 
        
        const chatFile = await processFileToBase64(file);
        
        // Verify base64 content
        if (!chatFile.content || chatFile.content.length === 0) {
          toast.error(`Failed to read ${file.name}`);
          continue;
        } 
        processedFiles.push(chatFile);
        
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        toast.error(`Failed to process ${file.name}`);
      }
    }
    
    setIsProcessing(false);
    return processedFiles;
  };

  // Convert text to file
  const convertTextToFile = (text: string) => {
    const fileName = detectFileNameFromText(text) || `code_${Date.now()}.txt`;
    const fileType = detectFileTypeFromText(text);
    
    // Create a text file
    const textBlob = new Blob([text], { type: fileType });
    const file = new File([textBlob], fileName, { type: fileType });
    
    // Process the file using existing processFiles function
    processFiles([file]).then(processedFiles => {
      if (processedFiles.length > 0) {
        setFiles(prev => [...prev, ...processedFiles]);
        setInput('');  
      }
    }).catch(error => {
      console.error('Error converting text to file:', error);
      toast.error('Failed to convert text to file');
    });
  };

  // Monitor input for large text
  useEffect(() => {
    const trimmedInput = input.trim();
    
    // Show banner if text is large
    if (trimmedInput.length > 5000 && files.length === 0) {
      setShowConvertBanner(true);
    } else {
      setShowConvertBanner(false);
    }
  }, [input, files.length]);

  // Handle file selection
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;
    
    console.log(`Selected ${fileList.length} files`);
    
    const processedFiles = await processFiles(fileList);
    if (processedFiles.length > 0) {
      setFiles(prev => [...prev, ...processedFiles]); 
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/10');
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/10');
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/10');
      
      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      if (droppedFiles.length === 0) return;
      
      console.log(`Dropped ${droppedFiles.length} files`);
      
      const processedFiles = await processFiles(droppedFiles);
      if (processedFiles.length > 0) {
        setFiles(prev => [...prev, ...processedFiles]); 
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Handle paste event for files and text
  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    
    // Check for files first
    const fileItems = items.filter(item => item.kind === 'file');
    if (fileItems.length > 0) {
      e.preventDefault();
      
      const filesToProcess: File[] = [];
      for (const item of fileItems) {
        const file = item.getAsFile();
        if (file) filesToProcess.push(file);
      }
      
      if (filesToProcess.length > 0) {
        const processedFiles = await processFiles(filesToProcess);
        if (processedFiles.length > 0) {
          setFiles(prev => [...prev, ...processedFiles]);
          toast.success(`Pasted ${processedFiles.length} file(s)`);
        }
        return;
      }
    }
    
    // Check for images in clipboard
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      
      const imageFiles: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
      
      if (imageFiles.length > 0) {
        const processedFiles = await processFiles(imageFiles);
        if (processedFiles.length > 0) {
          setFiles(prev => [...prev, ...processedFiles]);
          toast.success(`Pasted ${processedFiles.length} image(s)`);
        }
      }
      return;
    }
     
    const text = e.clipboardData.getData('text');
    if (text && text.length > 5000) { 
      setTimeout(() => {
        setShowConvertBanner(true);
      }, 100);
    }
  };

  const handleSubmit = () => {
    if (isStreaming || isProcessing) return;
    
    const trimmedInput = input.trim();

    if (!trimmedInput && files.length === 0) {
      toast.warning('Please enter a message or attach a file');
      return;
    }

    // Send normally (let user decide to convert or not)
    onSend(trimmedInput, files);
    
    // Reset state
    setInput('');
    setFiles([]);
    setShowConvertBanner(false);
    
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

  // Manual conversion button handler
  const handleManualConvertToFile = () => {
    if (!input.trim()) {
      toast.warning('Please enter some text first');
      return;
    }
    
    convertTextToFile(input.trim());
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // View full file content
  const viewFullFile = (file: ChatFile) => {
    if (file.type.startsWith('text/') || file.type.includes('code') || file.type.includes('script')) {
      try {
        // Decode base64 content
        const content = atob(file.content);
        setShowFullPreview(content);
      } catch (error) {
        toast.error('Could not decode file content');
      }
    } else {
      // For images, show in modal
      window.open(file.url, '_blank');
    }
  };

  // Download file
  const downloadFile = (file: ChatFile) => {
    try {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="relative" ref={dropZoneRef}>
      {/* Processing indicator */}
      {isProcessing && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Processing files...
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Please wait while your files are being prepared
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File attachments preview */}
      {files.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {files.length === 1 ? '1 file ready' : `${files.length} files ready`}
            </p>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
            {files.map(file => (
              <div
                key={file.id}
                className="group relative flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {file.type.startsWith('image/') ? (
                    <div className="relative flex-shrink-0">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <FileText className="w-10 h-10 text-blue-500 dark:text-blue-400 flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {file.type.split('/').pop()?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* View full button for text files */}
                  {(file.type.startsWith('text/') || file.type.includes('code')) && (
                    <button
                      onClick={() => viewFullFile(file)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="View full content"
                    >
                      <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
                  
                  {/* Download button */}
                  <button
                    onClick={() => downloadFile(file)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input container */}
      <div className="relative flex items-end gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isStreaming || isProcessing}
          className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach files (drag & drop supported)"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
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
            disabled={disabled || isStreaming || isProcessing}
            placeholder={
              isProcessing ? "Processing files..." :
              isStreaming ? "AI is thinking..." : 
              files.length > 0 ? "Add a message about your files (or just press Enter)..." : 
              "Type your message, paste text/files, or drag & drop files here..."
            }
            rows={1}
            className="w-full resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed text-base leading-6 max-h-[200px] overflow-y-auto"
            style={{ minHeight: '24px' }}
          />
          
          {/* Character count */}
          {input.length > 0 && (
            <div className="absolute bottom-0 right-0">
              <span className={`text-xs px-2 py-1 rounded-tl-lg ${
                input.length > 5000 
                  ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' 
                  : input.length > 2000 
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {input.length} chars
                {input.length > 3000 && ' (consider saving as file)'}
              </span>
            </div>
          )}
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
            disabled={disabled || isProcessing || (!input.trim() && files.length === 0)}
            className="flex-shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-sm hover:shadow"
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Conversion banner for large text */}
      {showConvertBanner && (
        <div className="mt-2 px-3 py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Large code/text pasted
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300">
                {input.length} chars (consider saving as file)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualConvertToFile}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Convert to file
            </button>
            <button
              onClick={() => setShowConvertBanner(false)}
              className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-800/50 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </button>
          </div>
        </div>
      )}

      {/* Full file preview modal */}
      {showFullPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">File Content Preview</h3>
              <button
                onClick={() => setShowFullPreview(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-sm bg-gray-50 dark:bg-gray-950">
              {showFullPreview}
            </pre>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowFullPreview(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hint text */}
      <div className="mt-2 px-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs">
              Enter
            </kbd>
            {' '}to send
          </span>
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            <span>Drag & drop or paste files</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {supportsImages && (
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              ✓ Vision enabled
            </span>
          )}
          {files.length > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              {files.length} file{files.length !== 1 ? 's' : ''} attached
            </span>
          )}
        </div>
      </div>
    </div>
  );
}