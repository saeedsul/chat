// AI Configuration - Uses Vite proxy to bypass CORS
// The proxy routes /api/ai -> http://localhost:12434/engines/v1

export const AI_CONFIG = {
  // Use proxy path for local development
  baseUrl: '/api/ai',
  
  // Leave empty for local Docker models
  apiKey: '',
  
  // Default model - matches the modelId in AIModel
  defaultModel: 'ai/gpt-oss',
};
