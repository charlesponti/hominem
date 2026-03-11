# Keeping Chat UIs in Sync Across Web and Mobile

There's a class of bug that doesn't show up in tests and rarely makes it into a ticket. It sits quietly in your product until someone puts a phone next to a laptop and says *these look completely different*. We hit that this week, and fixing it taught us something worth writing down.

---

## The drift problem

Our product lives on two surfaces: a React web app and a React Native mobile app. Both have chat. Both show a loading state while messages fetch. Both show something while the AI is thinking.

But they didn't look the same. On web, loading was a shimmer — animated placeholder rows with a pulsing circle and two ghosted lines, the standard skeleton-screen pattern. On mobile, loading was a centered title and a static circle. Not animated. Not even trying to match.

The thinking state was worse. On web, when the AI is processing your message, a small panel appears at the bottom of the thread: a muted icon box, a label that says "AI Assistant", and three dots bouncing in a staggered wave. On mobile: nothing. The input just went disabled. The AI was thinking, but the interface gave no indication of it.

Neither of these was a *mistake* exactly. The web component was written by someone who had time to do it properly. The mobile component was written later, in a hurry, and "good enough" shipped.

This is UI drift. It happens on every multi-surface product. It's not malicious — it's just entropy.

---

## Shared primitives for the web side

We maintain a package called `ai-elements`: a set of chat-specific UI primitives that live in our shared UI library. Things like `PromptInput`, `Message`, `Reasoning`, `Tool`, `ShimmerMessage`. The goal is that any web surface that needs AI chat can reach for the same building blocks instead of rolling its own.

The adoption work this week was completing that migration for our Notes app. Specifically: replacing a hand-rolled `SkeletonMessage` and `ThinkingComponent` with `ShimmerMessage` and `ThinkingIndicator` from the shared package.

`ThinkingIndicator` didn't exist yet, so we built it:

```tsx
export function ThinkingIndicator() {
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
```

The dots use a CSS animation class (`void-anim-breezy-stagger`) from our design system that fires a staggered wave — child elements animate at 0ms, 120ms, and 240ms offsets. Clean, declarative, no JavaScript involved.

We also added an `isStreaming` prop to our `Response` primitive — a blinking cursor that appears after content while a message is still being written out. Small detail, but it eliminates the slightly jarring experience of text just stopping mid-thought.

---

## The mobile problem

Here's the thing about `ai-elements`: it uses HTML. `div`, `span`, CSS classes. React Native doesn't have any of those. You cannot share these components with mobile. This is a fundamental constraint of the React / React Native split, and no amount of abstraction fully papers over it.

The instinct when you hit this wall is to reach for a cross-platform component library. We've tried that path before. The overhead of abstraction layers that work everywhere tends to produce components that feel right nowhere — too generic, too constrained by their own portability.

Our approach instead: **design to a visual spec, implement per platform**.

The spec isn't written down as a document. It's the component itself. The web `ShimmerMessage` *is* the spec. The mobile version has to look the same — same proportions, same rhythm, same information hierarchy — using whatever tools React Native provides.

For the shimmer, that means `Animated.Value` with an `Animated.loop` over two `timing` calls:

```tsx
function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])
  return opacity
}
```

The CSS `animate-pulse` on web is roughly a 1200ms ease-in-out opacity cycle. This matches it. `useNativeDriver: true` keeps the animation off the JS thread — important on mobile where animation jank is noticeable.

For the thinking indicator's staggered dots, the CSS approach uses `animation-delay`. In React Native you replicate the stagger by giving each dot its own `Animated.Value` and sequencing with `Animated.delay`:

```tsx
function useBounceDot(delay: number) {
  const translateY = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, { toValue: -4, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 2, duration: 230, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 170, useNativeDriver: true }),
        Animated.delay(1800 - 800 - delay),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [translateY, delay])
  return translateY
}

// Used as:
const dot1 = useBounceDot(0)
const dot2 = useBounceDot(120)
const dot3 = useBounceDot(240)
```

The delay offsets mirror what the CSS does. The bounce easing (up fast, settle slow) mirrors the `void-breezy-wave` keyframe in our animation system.

---

## What we learned

Shared components are the right answer for web. A single `ThinkingIndicator` in one package means every web surface gets the same component, and fixing it once fixes it everywhere.

Mobile requires a different strategy, but the goal is identical: **one visual spec, not one codebase**. The discipline is treating the web component as the source of truth for what something should look, feel, and move like — and then faithfully translating that into the mobile platform's animation model rather than improvising something new.

The failure mode we were recovering from is what happens when there's no source of truth at all. Each surface makes reasonable local decisions, and six months later someone puts a phone next to a laptop.

The fix isn't complicated. It's just intentional.
