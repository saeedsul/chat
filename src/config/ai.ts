 
export const AI_CONFIG = { 
  getBaseUrl: (modelId: string): string => {
    if (modelId.includes('llama')) {
      return '/api/llama';
    } else if (modelId.includes('mistral')) {
      return '/api/mistral';
    } 
    return '/api/mistral';
  },
   
  apiKey: '',
   
  defaultModel: 'mistral:latest',
};