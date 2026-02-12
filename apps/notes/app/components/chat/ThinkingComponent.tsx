import { Bot } from 'lucide-react';

export function ThinkingComponent() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="size-4 text-primary" />
      </div>
      <div className="flex-1 bg-muted/50 p-4 border border-border/50">
        <div className="text-sm font-medium text-muted-foreground mb-2">AI Assistant</div>
        <div className="flex items-center gap-2">
          <div className="flex space-x-1 void-anim-breezy-stagger">
            <div className="size-2 bg-primary" />
            <div className="size-2 bg-primary" />
            <div className="size-2 bg-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  );
}
