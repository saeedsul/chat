const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const AI_CONFIG = {
  apiKey: '', // Ollama doesn't need API key
  
  getBaseUrl: (modelId: string) => {
    // In development: use Vite proxy
    // In production: use Nginx proxy
    // Both use relative paths, proxies handle routing
    return '/api';
  },
  
  models: {
    'llama3.2:latest': {
      id: 'llama3.2:latest',
      name: 'Llama 3.2',
      provider: 'ollama',
    },
    'llava-phi3': {
      id: 'llava-phi3',
      name: 'Llava Phi3',
      provider: 'ollama',
    },
    'deepseek-coder:1.3b': {
      id: 'deepseek-coder:1.3b',
      name: 'DeepSeek Coder',
      provider: 'ollama',
    },
  },
};