import { Settings, Trash2, Download } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { AIModel } from '@/types/chat';

interface ChatHeaderProps {
  models: AIModel[];
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  onClearChat: () => void;
  onExportChat: () => void;
}

export function ChatHeader({ 
  models, 
  selectedModel, 
  onSelectModel, 
  onClearChat,
  onExportChat 
}: ChatHeaderProps) {
  return (
    <header className="glass border-b border-border/50 p-4">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <div className="flex-1">
          <ModelSelector 
            models={models} 
            selectedModel={selectedModel} 
            onSelectModel={onSelectModel} 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onExportChat}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Export chat"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClearChat}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
