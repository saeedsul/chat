import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, AIModel, ChatFile } from '@/types/chat';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { WelcomeScreen } from './WelcomeScreen'; 
import { toast } from 'sonner';
import { ChevronUp, ChevronDown, Minimize2, Maximize2, Upload, Copy as CopyIcon, Check as CheckIcon } from 'lucide-react';
import { ThinkingPulse } from './ThinkingSpinner';
 
 
const defaultModels: AIModel[] = [
  { 
    id: 'llama3.2:latest', 
    modelId: 'llama3.2:latest',
    name: 'Llama 3.2', 
    description: 'General purpose text (8B)', 
    status: 'ready', 
    supportsImages: true, 
    icon: 'message-square' 
  },
  { 
    id: 'llava-phi3', 
    modelId: 'llava-phi3',
    name: 'LLaVA-Phi3', 
    description: 'Fast vision (3.8B)', 
    status: 'ready', 
    supportsImages: true, 
    icon: 'zap' 
  },
  { 
    id: 'deepseek-coder-1.3b', 
    modelId: 'deepseek-coder:1.3b',
    name: 'DeepSeek Coder 1.3B', 
    description: 'Lightweight coding specialist', 
    status: 'ready', 
    supportsImages: false, 
    icon: 'code' 
  },
];

interface CollapsibleSection {
  id: string;
  messages: Message[];
  isCollapsed: boolean;
  title: string;
}

const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: ['application/pdf', 'text/plain', 'text/markdown', 'text/html', 'application/json', 'text/csv'],
  code: ['text/javascript', 'application/javascript', 'text/typescript', 'text/python', 'text/java', 'text/c', 'text/cpp', 'text/xml', 'application/xml']
};

export function FancyChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [models] = useState<AIModel[]>(defaultModels);
  const [selectedModel, setSelectedModel] = useState<AIModel>(defaultModels[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [collapsibleSections, setCollapsibleSections] = useState<CollapsibleSection[]>([]);
  const [showCollapseControls, setShowCollapseControls] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copiedFiles, setCopiedFiles] = useState<ChatFile[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef(false);
  const autoScrollRef = useRef(true);
  const userScrolledRef = useRef(false);

  const organizeMessagesIntoSections = useCallback((msgs: Message[]): CollapsibleSection[] => {
    const sections: CollapsibleSection[] = [];
    const SECTION_SIZE = 5;
    
    for (let i = 0; i < msgs.length; i += SECTION_SIZE) {
      const sectionMessages = msgs.slice(i, i + SECTION_SIZE);
      const sectionId = `section-${i / SECTION_SIZE}`;
      
      sections.push({
        id: sectionId,
        messages: sectionMessages,
        isCollapsed: i < msgs.length - SECTION_SIZE,
        title: `Messages ${i + 1}-${Math.min(i + SECTION_SIZE, msgs.length)}`,
      });
    }
    
    return sections;
  }, []);

 // FIXED: isValidBase64 function
const isValidBase64 = useCallback((str: string): boolean => {
  if (!str || str.length === 0) return false;
  
  // Remove whitespace and data URL prefix if present
  const cleanStr = str.trim().replace(/^data:[^;]+;base64,/, '');
  
  // Base64 regex (allows for padding)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cleanStr)) {
    return false;
  }
  
  try {
    // Try to decode
    atob(cleanStr);
    return true;
  } catch (err) {
    return false;
  }
}, []);

  // Helper function to detect programming language for code blocks
  const detectFileLanguage = useCallback((filename: string, mimeType: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'txt': 'text',
      'sh': 'bash',
      'bash': 'bash',
      'sql': 'sql',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
    };
    
    if (languageMap[extension]) {
      return languageMap[extension];
    }
    
    // Fallback based on mime type
    if (mimeType.includes('javascript')) return 'javascript';
    if (mimeType.includes('typescript')) return 'typescript';
    if (mimeType.includes('json')) return 'json';
    if (mimeType.includes('xml')) return 'xml';
    if (mimeType.includes('html')) return 'html';
    if (mimeType.includes('css')) return 'css';
    
    return 'text';
  }, []);

  // FIXED: Main function to send messages to the model
  const sendToModel = useCallback(async (userMessage: Message) => {
    if (!selectedModel || isProcessingRef.current) {
      return;
    }

    setIsStreaming(true);
    isProcessingRef.current = true;
    abortControllerRef.current = new AbortController();

    try { 
      // Build the initial prompt
      let prompt = userMessage.content;
      
      // Handle files if present
      if (userMessage.files && userMessage.files.length > 0) { 
        
        // Add clear instruction that files are included
        prompt += '\n\n=== ATTACHED FILES ===\n\n';
        
        for (const file of userMessage.files) { 
          
          try {
            // Try to decode base64 content
           let fileContent = '';

            if (isValidBase64(file.content)) {
              try {
                fileContent = atob(file.content); 
              } catch (decodeError) { 
                // Check if it's a data URL
                if (file.content.startsWith('data:')) {
                  try {
                    const base64Part = file.content.split(',')[1];
                    fileContent = atob(base64Part);
                  } catch (e) {
                    fileContent = file.content;
                  }
                } else {
                  fileContent = file.content;
                }
              }
            } else {
              // If not base64, check if it's already plain text
              try {
                // Try to decode as UTF-8
                fileContent = decodeURIComponent(escape(file.content));
              } catch (e) {
                fileContent = file.content;
              }
            }
            
            // Add file to prompt with clear formatting
            prompt += `--- FILE: ${file.name} ---\n`;
            prompt += `Type: ${file.type}\n`;
            prompt += `Size: ${(file.size / 1024).toFixed(1)} KB\n\n`;
            
            // Determine language for code block
            const language = detectFileLanguage(file.name, file.type);
            prompt += `\`\`\`${language}\n`;
            
            // Limit content to avoid hitting token limits
            const maxFileContentLength = 10000;
            if (fileContent.length > maxFileContentLength) {
              prompt += fileContent.substring(0, maxFileContentLength);
              prompt += `\n\n[File truncated. Original length: ${fileContent.length} characters]\n`;
            } else {
              prompt += fileContent + '\n';
            }
            
            prompt += `\`\`\`\n\n`;
            
          } catch (error) {
            console.error(`✗ Error processing file ${file.name}:`, error);
            prompt += `--- FILE: ${file.name} ---\n`;
            prompt += `Error: Could not read file content\n\n`;
          }
        }
        
        prompt += '=== END OF ATTACHED FILES ===\n\n';
        prompt += 'Based on the files above, please help me with my question.';
      }
 

      // Build the request body
      const requestBody: any = {
        model: selectedModel.modelId,
        prompt: prompt,
        stream: true
      };
 
      // Make request to proxy
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response Error:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // Create AI message
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };

      // Add AI message immediately to show spinner
      setMessages(prev => [...prev, aiMessage]);
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let aiResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.response) {
              aiResponse += parsed.response;
              
              // Update message immediately for each token
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, content: aiResponse, isStreaming: true } 
                  : msg
              ));
            }
            
            if (parsed.done) {
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, isStreaming: false } 
                  : msg
              ));
              break;
            }
          } catch (e) {
            console.error('Error parsing stream:', e, 'Line:', line);
          }
        }
      }

      // Mark as complete
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, isStreaming: false } 
          : msg
      ));

    } catch (error) {
      console.error('Error in sendToModel:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Request cancelled');
      } else {
        toast.error(`Failed: ${(error as Error).message}`);
      }
    } finally {
      setIsStreaming(false);
      isProcessingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [selectedModel, isValidBase64, detectFileLanguage]);

// FIXED: processFile function (replace existing one)
const processFile = useCallback(async (file: File): Promise<ChatFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      try {
        let base64Content: string;
        let url: string;
        
        if (file.type.startsWith('image/')) {
          // For images, read as Data URL
          const content = reader.result as string;
          base64Content = content.split(',')[1] || content;
          url = content;
        } else if (file.type.startsWith('text/') || 
                   SUPPORTED_FILE_TYPES.documents.includes(file.type) ||
                   SUPPORTED_FILE_TYPES.code.includes(file.type)) {
          // For text-based files, read as text and encode to base64
          const textContent = reader.result as string;
          base64Content = btoa(unescape(encodeURIComponent(textContent))); // Proper UTF-8 encoding
          url = `data:${file.type};base64,${base64Content}`;
        } else {
          // For binary files (like PDF), read as ArrayBuffer
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          
          // Convert bytes to base64
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
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
        console.error(`Error processing file ${file.name}:`, error);
        reject(new Error(`Failed to process file: ${file.name}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    // Choose reader method based on file type
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('text/') || 
               SUPPORTED_FILE_TYPES.documents.includes(file.type) ||
               SUPPORTED_FILE_TYPES.code.includes(file.type)) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}, []);
 

  // FIXED: Handle sending messages
  const handleSend = useCallback((content: string, files: ChatFile[]) => {
    if (isProcessingRef.current) {
      toast.warning('Please wait for the current response to complete');
      return;
    }

    if (!content.trim() && files.length === 0) {
      toast.warning('Please enter a message or attach a file');
      return;
    }  

    // Create user message WITH files attached
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content,
      timestamp: new Date(),
      files: files.length > 0 ? files : undefined,
    }; 

    // Add user message to state
    setMessages(prev => [...prev, userMessage]);

    // Send to model with the complete user message (including files)
    setTimeout(() => {
      sendToModel(userMessage);
    }, 0);

  }, [sendToModel, isValidBase64]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      isProcessingRef.current = false;
      toast.info('Response stopped');
    }
  }, []);

  useEffect(() => {
    if (messages.length > 5) {
      const sections = organizeMessagesIntoSections(messages);
      setCollapsibleSections(sections);
      setShowCollapseControls(true);
    } else {
      setCollapsibleSections([]);
      setShowCollapseControls(false);
    }
  }, [messages, organizeMessagesIntoSections]);

  useEffect(() => {
    if (autoScrollRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const validateFileSize = useCallback((file: File): boolean => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    toast.error(`${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: 5MB`);
    return false;
  }
  return true;
}, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Filter for supported types AND valid size
      const supportedFiles = files.filter(file => {
        if (!validateFileSize(file)) return false;
        
        const type = file.type;
        return (
          SUPPORTED_FILE_TYPES.images.includes(type) ||
          SUPPORTED_FILE_TYPES.documents.includes(type) ||
          SUPPORTED_FILE_TYPES.code.includes(type) ||
          type.startsWith('text/')
        );
      });

    if (supportedFiles.length === 0) {
      toast.error('No supported files. Supported: images, PDF, text, code');
      return;
    }

    const processedFiles: ChatFile[] = await Promise.all(
      supportedFiles.map(async (file) => {
        return await processFile(file);
      })
    );

    if (processedFiles.length > 0) {
      toast.success(`Added ${processedFiles.length} file(s)`);
      setDraggedFiles(supportedFiles);
      
      // Create message with files and send
      const fileMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `Uploaded ${processedFiles.length} file(s): ${processedFiles.map(f => f.name).join(', ')}`,
        timestamp: new Date(),
        files: processedFiles,
      };

      setMessages(prev => [...prev, fileMessage]);
      
      setTimeout(() => {
        sendToModel(fileMessage);
      }, 0);
    }
  }, [sendToModel, processFile]);

  const copyMessageToClipboard = useCallback(async (message: Message) => {
    let textToCopy = message.content;
    
    if (message.files && message.files.length > 0) {
      textToCopy += '\n\nFiles:\n' + message.files.map(f => `- ${f.name} (${(f.size / 1024).toFixed(2)} KB)`).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(message.id);
      toast.success('Message copied');
      
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  }, []);

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsibleSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, isCollapsed: !section.isCollapsed }
          : section
      )
    );
  };

  const collapseAllExceptLast = () => {
    setCollapsibleSections(prev =>
      prev.map((section, index) => ({
        ...section,
        isCollapsed: index < prev.length - 1
      }))
    );
  };

  const expandAllSections = () => {
    setCollapsibleSections(prev =>
      prev.map(section => ({
        ...section,
        isCollapsed: false
      }))
    );
  };

  const toggleAutoScroll = () => {
    autoScrollRef.current = !autoScrollRef.current;
    toast.info(autoScrollRef.current ? 'Auto-scroll ON' : 'Auto-scroll OFF');
  };

  // Add this useEffect to track user scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      // If user scrolls up, disable auto-scroll
      if (!isAtBottom) {
        userScrolledRef.current = true;
        autoScrollRef.current = false;
      }
      
      // If user scrolls to bottom, re-enable auto-scroll
      if (isAtBottom) {
        userScrolledRef.current = false;
        autoScrollRef.current = true;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      autoScrollRef.current = true;
      userScrolledRef.current = false;
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleModelSelect = useCallback((model: AIModel) => {
    if (model.status === 'offline') {
      toast.error(`${model.name} is offline`);
      return;
    }
    if (model.status === 'loading') {
      toast.warning(`${model.name} is loading...`);
    }
    setSelectedModel(model);
    toast.success(`Switched to ${model.name}`);
  }, []);

  const handleClearChat = useCallback(() => {
    if (isStreaming) {
      handleStop();
    }
    setMessages([]);
    setCollapsibleSections([]);
    setShowCollapseControls(false);
    setIsDragOver(false);
    setDraggedFiles([]);
    setCopiedFiles([]);
    toast.success('Chat cleared');
  }, [isStreaming, handleStop]);

  const handleExportChat = useCallback(() => {
    const exportData = {
      model: selectedModel.name,
      timestamp: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fancychat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported');
  }, [messages, selectedModel]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
 

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 transition-colors">
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        onSelectModel={handleModelSelect}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />

      <main 
        className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-950"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-colors">
            <div className="text-center p-8 rounded-2xl border-2 border-dashed border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20">
              <Upload className="h-16 w-16 mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-bounce" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Drop files here</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Supported: Images, PDF, text files, code files
              </p>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {showCollapseControls && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
                <div className="flex items-center gap-2">
                  <button
                    onClick={collapseAllExceptLast}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Minimize2 className="h-4 w-4" />
                    <span>Collapse Previous</span>
                  </button>
                  <button
                    onClick={expandAllSections}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span>Expand All</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAutoScroll}
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      autoScrollRef.current
                        ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {autoScrollRef.current ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                  </button>
                  <button
                    onClick={scrollToBottom}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span>Scroll to Bottom</span>
                  </button>
                </div>
              </div>
            )}

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-8 min-h-0 bg-white dark:bg-gray-950 relative"
              style={{ scrollBehavior: 'auto' }}
            >
              <div className="max-w-5xl mx-auto space-y-6 pb-4">
                {collapsibleSections.length > 0 ? (
                  collapsibleSections.map((section, index) => (
                    <div key={section.id} className="space-y-4">
                      {section.messages.length > 0 && section.isCollapsed && (
                        <button
                          onClick={() => toggleSectionCollapse(section.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                        >
                          <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <ChevronDown className="h-4 w-4 transition-transform group-hover:scale-110" />
                            <span className="font-medium">{section.title}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({section.messages.length} messages)
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Click to expand
                          </div>
                        </button>
                      )}
                      
                      {!section.isCollapsed && (
                        <>
                          {section.messages.map((message) => (
                            <div key={message.id} className="group relative">
                              {message.isStreaming && message.content === '' ? (
                                <ThinkingPulse />
                              ) : (
                                <ChatMessage message={message} />
                              )}
                              {!message.isStreaming && (
                                <button
                                  onClick={() => copyMessageToClipboard(message)}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  {copiedMessageId === message.id ? (
                                    <CheckIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
                                  ) : (
                                    <CopyIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                          
                          {index < collapsibleSections.length - 1 && (
                            <div className="flex justify-center py-2">
                              <button
                                onClick={() => toggleSectionCollapse(section.id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                              >
                                <ChevronUp className="h-4 w-4" />
                                Collapse section
                                <ChevronUp className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="group relative">
                      {message.isStreaming && message.content === '' ? (
                        <ThinkingPulse />
                      ) : (
                        <ChatMessage message={message} />
                      )}
                      {!message.isStreaming && (
                        <button
                          onClick={() => copyMessageToClipboard(message)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {copiedMessageId === message.id ? (
                            <CheckIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
                          ) : (
                            <CopyIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                          )}
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Floating scroll to bottom button */}
              {userScrolledRef.current && isStreaming && (
                <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
                  <button
                    onClick={scrollToBottom}
                    className="pointer-events-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-300"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span className="text-sm font-medium">New messages</span>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-4xl mx-auto relative">
          <ChatInput
            onSend={(content, files) => handleSend(content, files)}
            onStop={handleStop}
            disabled={!selectedModel}
            isStreaming={isStreaming}
            supportsImages={selectedModel?.supportsImages || false}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Chat AI • Using {selectedModel.name}
            {isStreaming && <span className="ml-2 animate-pulse text-blue-600 dark:text-blue-400">● AI thinking</span>}
          </p> 
        </div>
      </footer>
    </div>
  );
}