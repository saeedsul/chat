import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, AIModel, ChatFile } from '@/types/chat';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { streamChatCompletion } from '@/services/chatService'; 
import { toast } from 'sonner';
import { ChevronUp, ChevronDown, Minimize2, Maximize2, Upload, File, X, Copy, Check } from 'lucide-react';

const defaultModels: AIModel[] = [
  { 
    id: 'mistral', 
    modelId: 'mistral:latest',
    name: 'Mistral', 
    description: 'Fast and efficient (7.2B)', 
    status: 'ready', 
    supportsImages: false, 
    icon: 'cpu' 
  },
  { 
    id: 'llama3.2', 
    modelId: 'llama3.2:latest',
    name: 'LLaMA 3.2', 
    description: 'Compact powerhouse (3.2B)', 
    status: 'ready', 
    supportsImages: false, 
    icon: 'brain' 
  },
  { 
    id: 'phi3', 
    modelId: 'phi3:latest',
    name: 'Phi-3', 
    description: 'Microsoft\'s efficient model (3.8B)', 
    status: 'ready', 
    supportsImages: false, 
    icon: 'zap' 
  },
  { 
    id: 'codellama', 
    modelId: 'codellama:latest',
    name: 'Code Llama', 
    description: 'Specialized for coding (7B)', 
    status: 'ready', 
    supportsImages: false, 
    icon: 'code' 
  },
  { 
    id: 'llava', 
    modelId: 'llava:latest',
    name: 'LLaVA Vision', 
    description: 'Image understanding (7B)', 
    status: 'ready', 
    supportsImages: true, 
    icon: 'image' 
  },
];

interface CollapsibleSection {
  id: string;
  messages: Message[];
  isCollapsed: boolean;
  title: string;
}

// Supported file types for drag & drop
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
  
  // State for collapsible sections
  const [collapsibleSections, setCollapsibleSections] = useState<CollapsibleSection[]>([]);
  const [showCollapseControls, setShowCollapseControls] = useState(false);
  
  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  
  // Copy-paste state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copiedFiles, setCopiedFiles] = useState<ChatFile[]>([]);
  
  // ADD THESE REFS
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef(false);
  const assistantIdRef = useRef<string | null>(null);
  const accumulatedContentRef = useRef('');

  // Auto-scroll while streaming
  const autoScrollRef = useRef(true);

  // Function to organize messages into collapsible sections
  const organizeMessagesIntoSections = useCallback((msgs: Message[]): CollapsibleSection[] => {
    const sections: CollapsibleSection[] = [];
    const SECTION_SIZE = 5; // Number of messages per section
    
    for (let i = 0; i < msgs.length; i += SECTION_SIZE) {
      const sectionMessages = msgs.slice(i, i + SECTION_SIZE);
      const sectionId = `section-${i / SECTION_SIZE}`;
      
      sections.push({
        id: sectionId,
        messages: sectionMessages,
        isCollapsed: i < msgs.length - SECTION_SIZE, // Collapse all except the last section
        title: `Messages ${i + 1}-${Math.min(i + SECTION_SIZE, msgs.length)}`,
      });
    }
    
    return sections;
  }, []);

  // FIXED: sendToModel function - MOVED TO TOP
  const sendToModel = useCallback(async (allMessages: Message[]) => {
    if (isProcessingRef.current) {
      toast.warning('Please wait for the current response to complete');
      return;
    }

    isProcessingRef.current = true;
    setIsStreaming(true);
    
    // Reset accumulated content
    accumulatedContentRef.current = '';
    
    // Generate a new assistant ID
    assistantIdRef.current = crypto.randomUUID();
    const assistantId = assistantIdRef.current;
    
    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Create assistant message
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    // Add assistant message immediately
    setMessages(prev => [...prev, assistantMessage]);

    try {
      await streamChatCompletion(
        allMessages,
        selectedModel.modelId,
        {
          onToken: (token) => {
            accumulatedContentRef.current += token;
            
            // Update the specific assistant message
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { 
                    ...msg, 
                    content: accumulatedContentRef.current,
                    isStreaming: true
                  }
                : msg
            ));
            
            // Auto-scroll while streaming if enabled
            if (autoScrollRef.current && messagesContainerRef.current) {
              const container = messagesContainerRef.current;
              const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
              
              if (isAtBottom) {
                requestAnimationFrame(() => {
                  container.scrollTop = container.scrollHeight;
                });
              }
            }
          },
          onComplete: () => {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, isStreaming: false }
                : msg
            ));
            setIsStreaming(false);
            isProcessingRef.current = false;
            assistantIdRef.current = null;
            abortControllerRef.current = null;
          },
          onError: (error) => {
            toast.error(`Error: ${error.message}`);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { 
                    ...msg, 
                    content: `Error: ${error.message}`, 
                    isStreaming: false 
                  }
                : msg
            ));
            setIsStreaming(false);
            isProcessingRef.current = false;
            assistantIdRef.current = null;
            abortControllerRef.current = null;
          },
        },
        abortControllerRef.current.signal
      );
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
      setIsStreaming(false);
      isProcessingRef.current = false;
      assistantIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [selectedModel.modelId]);

  // Update sections when messages change
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

  // Auto-scroll to bottom when new messages come in
  useEffect(() => {
    if (autoScrollRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages]);

  // Handle drag events
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter supported files
    const supportedFiles = files.filter(file => {
      const type = file.type;
      return (
        SUPPORTED_FILE_TYPES.images.includes(type) ||
        SUPPORTED_FILE_TYPES.documents.includes(type) ||
        SUPPORTED_FILE_TYPES.code.includes(type) ||
        type.startsWith('text/')
      );
    });

    if (supportedFiles.length === 0) {
      toast.error('No supported files detected. Supported types: images, PDF, text files, code files');
      return;
    }

    // Show loading toast
    toast.loading(`Processing ${supportedFiles.length} file(s)...`);

    // Process files
    const processedFiles: ChatFile[] = await Promise.all(
      supportedFiles.map(async (file) => {
        return await processFile(file);
      })
    );

    // Clear any existing toast
    toast.dismiss();
    
    if (processedFiles.length > 0) {
      toast.success(`Added ${processedFiles.length} file(s) to chat`);
      setDraggedFiles(supportedFiles);
      
      // Add files as a new message
      const fileMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `Uploaded ${processedFiles.length} file(s): ${processedFiles.map(f => f.name).join(', ')}`,
        timestamp: new Date(),
        files: processedFiles,
      };

      setMessages(prev => {
        const newMessages = [...prev, fileMessage];
        setTimeout(() => {
          sendToModel(newMessages);
        }, 0);
        return newMessages;
      });
    }
  }, [sendToModel]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
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
            files.push(file);
          }
        }
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        item.getAsString(str => {
          textContent = str;
        });
      }
    }

    // If files were pasted
    if (files.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for files
      
      toast.loading(`Processing ${files.length} file(s) from clipboard...`);
      
      const processedFiles: ChatFile[] = await Promise.all(
        files.map(async (file) => {
          return await processFile(file);
        })
      );

      toast.dismiss();
      
      if (processedFiles.length > 0) {
        toast.success(`Pasted ${processedFiles.length} file(s) from clipboard`);
        setCopiedFiles(processedFiles);
        
        // Create message with pasted files
        const fileMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: textContent || `Pasted ${processedFiles.length} file(s) from clipboard: ${processedFiles.map(f => f.name).join(', ')}`,
          timestamp: new Date(),
          files: processedFiles,
        };

        setMessages(prev => {
          const newMessages = [...prev, fileMessage];
          setTimeout(() => {
            sendToModel(newMessages);
          }, 0);
          return newMessages;
        });
      }
    }
    // If only text was pasted, let the ChatInput handle it
  }, [sendToModel]);

  // Helper function to process files
  const processFile = async (file: File): Promise<ChatFile> => {
    return new Promise((resolve) => {
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

  // Function to copy message content to clipboard
  const copyMessageToClipboard = useCallback(async (message: Message) => {
    let textToCopy = message.content;
    
    // Include file information if present
    if (message.files && message.files.length > 0) {
      textToCopy += '\n\nFiles:\n' + message.files.map(f => `- ${f.name} (${(f.size / 1024).toFixed(2)} KB)`).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(message.id);
      toast.success('Message copied to clipboard');
      
      // Reset copy indicator after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy message');
    }
  }, []);

  // Function to copy file content to clipboard
  const copyFileToClipboard = useCallback(async (file: ChatFile) => {
    try {
      // For text files, copy the content
      if (file.type.startsWith('text/') || 
          SUPPORTED_FILE_TYPES.code.includes(file.type) ||
          SUPPORTED_FILE_TYPES.documents.includes(file.type)) {
        const content = atob(file.content);
        await navigator.clipboard.writeText(content);
        toast.success(`Content of "${file.name}" copied to clipboard`);
      } else {
        // For images, copy as data URL
        const blob = await fetch(file.url).then(r => r.blob());
        const data = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([data]);
        toast.success(`Image "${file.name}" copied to clipboard`);
      }
    } catch (err) {
      toast.error('Failed to copy file');
    }
  }, []);

  // Toggle section collapse
  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsibleSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, isCollapsed: !section.isCollapsed }
          : section
      )
    );
  };

  // Collapse all sections except the last one
  const collapseAllExceptLast = () => {
    setCollapsibleSections(prev =>
      prev.map((section, index) => ({
        ...section,
        isCollapsed: index < prev.length - 1
      }))
    );
  };

  // Expand all sections
  const expandAllSections = () => {
    setCollapsibleSections(prev =>
      prev.map(section => ({
        ...section,
        isCollapsed: false
      }))
    );
  };

  // Toggle auto-scroll
  const toggleAutoScroll = () => {
    autoScrollRef.current = !autoScrollRef.current;
    toast.info(autoScrollRef.current ? 'Auto-scroll enabled' : 'Auto-scroll disabled');
  };

  // FIXED: handleStop function
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // Mark assistant message as complete
      if (assistantIdRef.current) {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantIdRef.current 
            ? { ...msg, isStreaming: false }
            : msg
        ));
      }
      
      setIsStreaming(false);
      isProcessingRef.current = false;
      assistantIdRef.current = null;
      toast.info('Response stopped');
    }
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // FIXED: handleSend function
  const handleSend = useCallback((content: string, files: ChatFile[]) => {
    if (isProcessingRef.current) {
      toast.warning('Please wait for the current response to complete');
      return;
    }

    if (!content.trim() && files.length === 0) {
      toast.warning('Please enter a message or attach a file');
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      files: files.length > 0 ? files : undefined,
    };

    // Add user message and then send all messages
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      
      // Start streaming after state update
      setTimeout(() => {
        sendToModel(newMessages);
      }, 0);
      
      return newMessages;
    });
  }, [sendToModel]);

  // Rest of your component remains the same...
  const handleModelSelect = useCallback((model: AIModel) => {
    if (model.status === 'offline') {
      toast.error(`${model.name} is currently offline`);
      return;
    }
    if (model.status === 'loading') {
      toast.warning(`${model.name} is still loading...`);
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
    // Clear drag & drop state
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
    toast.success('Chat exported successfully');
  }, [messages, selectedModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

return (
  <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
    <ChatHeader
      models={models}
      selectedModel={selectedModel}
      onSelectModel={handleModelSelect}
      onClearChat={handleClearChat}
      onExportChat={handleExportChat}
    />

    <main 
      className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-950"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-colors">
          <div className="text-center p-8 rounded-2xl border-2 border-dashed border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20">
            <Upload className="h-16 w-16 mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-bounce" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Drop files here</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Supported: Images, PDF, text files, code files
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {SUPPORTED_FILE_TYPES.images.map(type => (
                <span key={type} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 rounded text-xs">
                  {type.split('/')[1]}
                </span>
              ))}
            </div>
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
                  title="Collapse all except current"
                >
                  <Minimize2 className="h-4 w-4" />
                  <span>Collapse Previous</span>
                </button>
                <button
                  onClick={expandAllSections}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  title="Expand all sections"
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
                  title="Toggle auto-scroll"
                >
                  {autoScrollRef.current ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                </button>
                <button
                  onClick={scrollToBottom}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  title="Scroll to bottom"
                >
                  <ChevronDown className="h-4 w-4" />
                  <span>Scroll to Bottom</span>
                </button>
              </div>
            </div>
          )}

          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 min-h-0 bg-gray-50 dark:bg-gray-950"
          >
            <div className="max-w-4xl mx-auto space-y-6 pb-4">
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
                            <ChatMessage message={message} />
                            <button
                              onClick={() => copyMessageToClipboard(message)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="Copy message to clipboard"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                              )}
                            </button>
                            
                            {message.files && message.files.length > 0 && (
                              <div className="flex gap-2 mt-2 pl-4">
                                {message.files.map(file => (
                                  <button
                                    key={file.id}
                                    onClick={() => copyFileToClipboard(file)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                                    title={`Copy ${file.name} to clipboard`}
                                  >
                                    <File className="h-3 w-3" />
                                    {file.name}
                                    <Copy className="h-3 w-3 ml-1" />
                                  </button>
                                ))}
                              </div>
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
                    <ChatMessage message={message} />
                    <button
                      onClick={() => copyMessageToClipboard(message)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Copy message to clipboard"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                      )}
                    </button>
                    
                    {message.files && message.files.length > 0 && (
                      <div className="flex gap-2 mt-2 pl-4">
                        {message.files.map(file => (
                          <button
                            key={file.id}
                            onClick={() => copyFileToClipboard(file)}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                            title={`Copy ${file.name} to clipboard`}
                          >
                            <File className="h-3 w-3" />
                            {file.name}
                            <Copy className="h-3 w-3 ml-1" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}
    </main>

    <footer className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto relative">
        <ChatInput 
          onSend={handleSend} 
          onStop={handleStop}
          disabled={isProcessingRef.current}
          isStreaming={isStreaming}
          supportsImages={selectedModel.supportsImages}
          onPaste={handlePaste}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
          Chat AI • Using {selectedModel.name}
          {isStreaming && <span className="ml-2 animate-pulse text-blue-600 dark:text-blue-400">● AI thinking</span>}
        </p>
        
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 animate-pulse">
          <Upload className="h-4 w-4 inline mr-1" />
          Drag & drop files here or paste from clipboard
        </div>
      </div>
    </footer>
  </div>
);
}