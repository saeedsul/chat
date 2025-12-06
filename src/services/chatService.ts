import { AI_CONFIG } from '@/config/ai';
import { Message } from '@/types/chat'; 

interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function streamChatCompletion(
  messages: Message[],
  modelId: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const { onToken, onComplete, onError } = callbacks;

  // Convert messages to Ollama format with image support
  const chatMessages = messages.map(msg => {
    const messageContent: any = {
      role: msg.role,
      content: msg.content,
    };

    // Add images if present (for vision models)
    if (msg.files && msg.files.length > 0) {
      const images = msg.files
        .filter(f => f.type.startsWith('image/'))
        .map(f => f.content); // Use the data URL directly
      
      if (images.length > 0) {
        messageContent.images = images;
      }
    }

    return messageContent;
  });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (AI_CONFIG.apiKey) {
      headers['Authorization'] = `Bearer ${AI_CONFIG.apiKey}`;
    }

    const baseUrl = AI_CONFIG.getBaseUrl(modelId);

    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: chatMessages,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        try {
          const parsed = JSON.parse(trimmedLine);
          
          if (parsed.message?.content) {
            onToken(parsed.message.content);
          }
          
          if (parsed.done === true) {
            onComplete();
            return;
          }
        } catch (parseError) {
          console.warn('Failed to parse JSON line:', trimmedLine, parseError);
        }
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.message?.content) {
          onToken(parsed.message.content);
        }
        if (parsed.done === true) {
          onComplete();
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }

    onComplete();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      onComplete();
      return;
    }
    onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}