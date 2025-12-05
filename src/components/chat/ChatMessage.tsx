import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { User, Bot, Copy, Check, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex gap-4 animate-slide-up', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary/80 border border-primary/30'
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-primary" />}
      </div>

      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex flex-col items-end')}>
        {message.files && message.files.length > 0 && (
          <div className={cn('flex flex-wrap gap-2 mb-2', isUser && 'justify-end')}>
            {message.files.map((file) => (
              <div key={file.id} className="glass rounded-lg p-2 flex items-center gap-2">
                {file.type.startsWith('image/') ? (
                  file.preview ? (
                    <img src={file.preview} alt={file.name} className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-primary" />
                  )
                ) : (
                  <FileText className="w-6 h-6 text-primary" />
                )}
                <span className="text-sm text-muted-foreground truncate max-w-[150px]">{file.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className={cn(
          'rounded-2xl px-4 py-3 relative group',
          isUser 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800'
        )}>
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className={cn(
              'prose prose-invert prose-sm max-w-none',
              '[&_pre]:bg-zinc-950 [&_pre]:border [&_pre]:border-zinc-700 [&_pre]:rounded-lg [&_pre]:my-2',
              '[&_code]:text-cyan-400 [&_code]:bg-transparent',
              '[&_p]:my-2 [&_p]:leading-relaxed',
              '[&_ul]:my-2 [&_ol]:my-2',
              '[&_li]:my-0.5',
              '[&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2',
              '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2',
              '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
              '[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic',
              '[&_a]:text-primary [&_a]:underline',
              '[&_table]:border-collapse [&_th]:border [&_th]:border-zinc-700 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-zinc-700 [&_td]:px-2 [&_td]:py-1',
              message.isStreaming && 'after:content-["▊"] after:animate-pulse after:text-primary after:ml-0.5'
            )}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !className;
                    
                    if (isInline) {
                      return (
                        <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-cyan-400 text-xs" {...props}>
                          {children}
                        </code>
                      );
                    }
                    
                    return (
                      <SyntaxHighlighter
                        style={oneDark as { [key: string]: React.CSSProperties }}
                        language={match?.[1] || 'text'}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          fontSize: '0.8rem',
                          borderRadius: '0.5rem',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          
          {!isUser && !message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-secondary"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        <div className={cn('text-xs text-muted-foreground mt-1', isUser && 'text-right')}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
