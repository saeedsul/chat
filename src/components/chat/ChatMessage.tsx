import { Message } from '@/types/chat';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message;
  isDarkMode?: boolean;
}

export function ChatMessage({ message, isDarkMode = false }: ChatMessageProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isUser = message.role === 'user';

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-start' : 'justify-end'} w-full`}>
      {/* User messages - Left side */}
      {isUser && (
        <>
          {/* User Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>

          {/* User Message Content */}
          <div className="flex-1 max-w-3xl">
            <div className="bg-white dark:bg-gray-900 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>

              {/* File attachments */}
              {message.files && message.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Attachments ({message.files.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                      >
                        {file.type.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-md">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* AI messages - Right side */}
      {!isUser && (
        <>
          {/* AI Message Content */}
          <div className="flex-1 max-w-3xl">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

                      // Create filtered props without ReactMarkdown-specific props
                      const filteredProps = { ...props };
                      delete (filteredProps as any).inline;
                      delete (filteredProps as any).node;

                      return !inline && match ? (
                        <div className="relative group my-4">
                          {/* Language label and copy button */}
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-t-lg border-b border-gray-700">
                            <span className="text-xs font-mono uppercase tracking-wide">
                              {match[1]}
                            </span>
                            <button
                              onClick={() => copyCode(codeString, codeId)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                            >
                              {copiedCode === codeId ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>

                          {/* Code block with syntax highlighting */}
                          <SyntaxHighlighter
                            style={isDarkMode ? oneDark : oneLight}
                            language={match[1]}
                            customStyle={{
                              margin: 0,
                              borderTopLeftRadius: 0,
                              borderTopRightRadius: 0,
                              borderBottomLeftRadius: '0.5rem',
                              borderBottomRightRadius: '0.5rem',
                              fontSize: '0.875rem',
                              lineHeight: '1.5',
                            }}
                            {...filteredProps}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code
                          className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono text-red-600 dark:text-red-400"
                          {...filteredProps}
                        >
                          {children}
                        </code>
                      );
                    },
                    p({ children }: any) {
                      return (
                        <p className="text-gray-900 dark:text-gray-100 leading-7 mb-4 last:mb-0">
                          {children}
                        </p>
                      );
                    },
                    ul({ children }: any) {
                      return (
                        <ul className="list-disc list-inside space-y-2 text-gray-900 dark:text-gray-100 mb-4">
                          {children}
                        </ul>
                      );
                    },
                    ol({ children }: any) {
                      return (
                        <ol className="list-decimal list-inside space-y-2 text-gray-900 dark:text-gray-100 mb-4">
                          {children}
                        </ol>
                      );
                    },
                    h1({ children }: any) {
                      return (
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-6">
                          {children}
                        </h1>
                      );
                    },
                    h2({ children }: any) {
                      return (
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 mt-5">
                          {children}
                        </h2>
                      );
                    },
                    h3({ children }: any) {
                      return (
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4">
                          {children}
                        </h3>
                      );
                    },
                    blockquote({ children }: any) {
                      return (
                        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200 italic">
                          {children}
                        </blockquote>
                      );
                    },
                    a({ href, children }: any) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {message.content || ''}
                </ReactMarkdown>
              </div>

              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-blue-600 dark:bg-blue-400 animate-pulse ml-1" />
              )}
            </div>
          </div>

          {/* AI Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </>
      )}
    </div>
  );
}