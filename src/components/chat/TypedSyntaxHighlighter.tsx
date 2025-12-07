// In TypedSyntaxHighlighter.tsx

import SyntaxHighlighter from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface TypedSyntaxHighlighterProps {
  language: string;
  children: string;
  isDarkMode?: boolean;
  customStyle?: React.CSSProperties;
  PreTag?: React.ComponentType<any> | keyof JSX.IntrinsicElements;
  [key: string]: any;
}

export function TypedSyntaxHighlighter({ 
  language,
  children,
  isDarkMode = false,
  customStyle,
  // Remove PreTag parameter
  ...props
}: TypedSyntaxHighlighterProps) {
  return (
    <SyntaxHighlighter
      style={isDarkMode ? oneDark : oneLight}
      language={language}
      PreTag="div" // Hardcode it here
      customStyle={customStyle}
      {...props}
    >
      {children}
    </SyntaxHighlighter>
  );
}