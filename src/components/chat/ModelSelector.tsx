import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Cpu, Zap, Brain, Sparkles, Image as ImageIcon, Code, Check, AlertCircle, X } from 'lucide-react';
import { AIModel } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Portal } from './Portal';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  cpu: <Cpu className="w-5 h-5" />,
  zap: <Zap className="w-5 h-5" />,
  brain: <Brain className="w-5 h-5" />,
  sparkles: <Sparkles className="w-5 h-5" />,
  image: <ImageIcon className="w-5 h-5" />,
  code: <Code className="w-5 h-5" />,
};

const statusColors = {
  ready: 'bg-emerald-500',
  loading: 'bg-amber-500 animate-pulse',
  offline: 'bg-red-500',
};

const statusLabels = {
  ready: 'Ready',
  loading: 'Loading...',
  offline: 'Offline',
};

export function ModelSelector({ models, selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleButtonClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleModelSelect = (model: AIModel) => {
    if (model.status !== 'ready') {
      return;
    }
    onSelectModel(model);
    setIsOpen(false);
  };

  return (
    <>
      {/* Main Selector Button */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className={cn(
            "glass-hover flex items-center gap-3 px-4 py-3 rounded-xl w-full",
            "border border-transparent hover:border-border/50 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            isOpen && "border-border bg-secondary/30"
          )}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
            "bg-primary/10 text-primary",
            isOpen && "bg-primary/20"
          )}>
            {iconMap[selectedModel.icon] || <Cpu className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">
                {selectedModel.name}
              </span>
              <div className="flex items-center gap-1">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  statusColors[selectedModel.status]
                )} />
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {statusLabels[selectedModel.status]}
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {selectedModel.description}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedModel.supportsImages && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500 hidden md:inline">
                Vision
              </span>
            )}
            <ChevronDown className={cn(
              'w-5 h-5 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180 text-foreground'
            )} />
          </div>
        </button>
      </div>

      {/* Portal-based Dropdown */}
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999]" onClick={() => setIsOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            
            {/* Dropdown positioned relative to button */}
            <div 
              className="absolute z-[10000]"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${position.width}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "glass rounded-xl border border-border shadow-2xl overflow-hidden backdrop-blur-xl",
                "animate-in fade-in slide-in-from-top-2 duration-200",
                "max-h-[80vh] overflow-y-auto"
              )}>
                {/* Header with close button */}
                <div className="sticky top-0 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Ready</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Loading</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs text-muted-foreground">Offline</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-secondary rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Available count */}
                <div className="px-4 py-2 bg-background/50 border-b border-border/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Select AI Model</span>
                    <span className="text-xs text-muted-foreground">
                      {models.filter(m => m.status === 'ready').length} of {models.length} available
                    </span>
                  </div>
                </div>

                {/* Model List */}
                <div className="overflow-y-auto">
                  {models.map((model) => {
                    const isSelected = model.id === selectedModel.id;
                    const isDisabled = model.status !== 'ready';
                    
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model)}
                        disabled={isDisabled}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 w-full",
                          "hover:bg-secondary/50 transition-colors duration-150",
                          "focus:outline-none focus:bg-secondary/50",
                          isSelected && "bg-primary/10",
                          isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                        )}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={isDisabled}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
                          isSelected 
                            ? "bg-primary/20 text-primary" 
                            : "bg-muted text-muted-foreground",
                          isDisabled && "bg-muted/50"
                        )}>
                          {iconMap[model.icon] || <Cpu className="w-5 h-5" />}
                        </div>
                        
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "font-medium text-foreground truncate",
                              isSelected && "text-primary",
                              isDisabled && "text-muted-foreground"
                            )}>
                              {model.name}
                            </span>
                            {model.supportsImages && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-500 flex items-center gap-1 flex-shrink-0">
                                <ImageIcon className="w-3 h-3" />
                                Vision
                              </span>
                            )}
                          </div>
                          <div className={cn(
                            "text-sm text-muted-foreground truncate",
                            isSelected && "text-primary/80",
                            isDisabled && "text-muted-foreground/70"
                          )}>
                            {model.description}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            statusColors[model.status]
                          )} />
                          
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                          
                          {isDisabled && model.status === 'offline' && (
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-xl">
                  <p className="text-xs text-muted-foreground text-center">
                    All models run locally on your device for privacy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}