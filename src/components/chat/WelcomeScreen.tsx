import { Sparkles } from 'lucide-react';

export function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse-glow">
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </div>
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl -z-10" />
      </div>
      
      <h1 className="text-3xl font-bold">
        <span className="gradient-text">Local Chat</span>
        <span className="gradient-text"> AI</span>
      </h1>
    </div>
  );
}
