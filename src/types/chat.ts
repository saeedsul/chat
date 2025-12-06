export interface ChatFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url : string;
  content: string;
  preview?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string; 
  timestamp: Date;
  files?: ChatFile[];  
  isStreaming?: boolean;
}

export interface AIModel {
  id: string;
  modelId: string; // Actual model identifier for API calls (e.g., 'ai/gpt-oss')
  name: string;
  description: string;
  status: 'ready' | 'loading' | 'offline';
  supportsImages: boolean;
  icon: string;
}
