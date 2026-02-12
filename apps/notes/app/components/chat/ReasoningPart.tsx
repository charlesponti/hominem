interface ReasoningPartProps {
  reasoning: string;
  index: number;
}

export function ReasoningPart({ reasoning, index }: ReasoningPartProps) {
  return (
    <div
      key={`reasoning-${reasoning.slice(0, 20)}-${index}`}
      className="bg-muted/50 p-3 border border-border/50 mt-2"
    >
      <div className="font-medium text-sm flex items-center gap-2 text-muted-foreground mb-2">
        <span className="text-base">🤔</span>
        <span>Reasoning</span>
      </div>
      <div className="text-sm opacity-80 whitespace-pre-wrap leading-relaxed">{reasoning}</div>
    </div>
  );
}
