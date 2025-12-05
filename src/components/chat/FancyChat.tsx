import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, AIModel, ChatFile } from '@/types/chat';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { streamChatCompletion } from '@/services/chatService'; 
import { toast } from 'sonner';
import { ChevronUp, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';

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

  // FIXED: sendToModel function
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
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        onSelectModel={handleModelSelect}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Collapse Controls */}
            {showCollapseControls && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={collapseAllExceptLast}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                    title="Collapse all except current"
                  >
                    <Minimize2 className="h-4 w-4" />
                    <span>Collapse Previous</span>
                  </button>
                  <button
                    onClick={expandAllSections}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
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
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                    title="Toggle auto-scroll"
                  >
                    {autoScrollRef.current ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                  </button>
                  <button
                    onClick={scrollToBottom}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                    title="Scroll to bottom"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span>Scroll to Bottom</span>
                  </button>
                </div>
              </div>
            )}

            {/* Messages Container */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto scrollbar-thin p-4 min-h-0"
            >
              <div className="max-w-4xl mx-auto space-y-6 pb-4">
                {collapsibleSections.length > 0 ? (
                  collapsibleSections.map((section, index) => (
                    <div key={section.id} className="space-y-4">
                      {/* Section Header */}
                      {section.messages.length > 0 && section.isCollapsed && (
                        <button
                          onClick={() => toggleSectionCollapse(section.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30 hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className="h-4 w-4 transition-transform group-hover:scale-110" />
                            <span className="font-medium">{section.title}</span>
                            <span className="text-sm text-muted-foreground">
                              ({section.messages.length} messages)
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Click to expand
                          </div>
                        </button>
                      )}
                      
                      {/* Section Content */}
                      {!section.isCollapsed && (
                        <>
                          {section.messages.map((message) => (
                            <ChatMessage key={message.id} message={message} />
                          ))}
                          
                          {/* Section Footer (only for non-last sections) */}
                          {index < collapsibleSections.length - 1 && (
                            <div className="flex justify-center py-2">
                              <button
                                onClick={() => toggleSectionCollapse(section.id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-border hover:bg-accent transition-colors"
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
                  // Show all messages if no sections (less than 5 messages)
                  messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-border/50">
        <div className="max-w-4xl mx-auto relative">
          <ChatInput 
            onSend={handleSend} 
            onStop={handleStop}
            disabled={isProcessingRef.current}
            isStreaming={isStreaming}
            supportsImages={selectedModel.supportsImages}
          />
          <p className="text-xs text-muted-foreground text-center mt-3">
            FancyChat AI • Using {selectedModel.name} • Press Enter to send, Shift+Enter for new line
            {isStreaming && <span className="ml-2 animate-pulse">● AI thinking</span>}
          </p>
        </div>
      </footer>
    </div>
  );
}