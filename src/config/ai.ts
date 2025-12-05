// AI Configuration
export const AI_CONFIG = {
  // Dynamic base URL based on model
  getBaseUrl: (modelId: string): string => {
    if (modelId.includes('llama')) {
      return '/api/llama';
    } else if (modelId.includes('mistral')) {
      return '/api/mistral';
    } else if (modelId.includes('phi3')) {
      return '/api/phi3';
    } else if (modelId.includes('codellama')) {
      return '/api/codellama';
    } else if (modelId.includes('llava')) {
      return '/api/llava';
    }
    // Default to mistral
    return '/api/mistral';
  },
   
  apiKey: '',
   
  defaultModel: 'mistral:latest',
};