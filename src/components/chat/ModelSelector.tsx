import { useState } from 'react';
import { ChevronDown, Cpu, Zap, Brain, Sparkles } from 'lucide-react';
import { AIModel } from '@/types/chat';
import { cn } from '@/lib/utils';

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
};

const statusColors = {
  ready: 'bg-emerald-500',
  loading: 'bg-amber-500 animate-pulse',
  offline: 'bg-red-500',
};

export function ModelSelector({ models, selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-hover flex items-center gap-3 px-4 py-3 rounded-xl w-full"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 text-primary">
          {iconMap[selectedModel.icon]}
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-foreground">{selectedModel.name}</div>
          <div className="text-sm text-muted-foreground">{selectedModel.description}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', statusColors[selectedModel.status])} />
          <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden z-50 animate-fade-in">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onSelectModel(model);
                setIsOpen(false);
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 w-full hover:bg-secondary/50 transition-colors',
                model.id === selectedModel.id && 'bg-secondary/30'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg',
                model.id === selectedModel.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {iconMap[model.icon]}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{model.name}</span>
                  {model.supportsImages && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Vision</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{model.description}</div>
              </div>
              <span className={cn('w-2 h-2 rounded-full', statusColors[model.status])} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
