import { useEffect, useState } from 'react';

export function BackgroundElements() {
  const icons = ['404', '❌', '🤔', '💫'] as const;
  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
      {[...Array(20)].map((_, i) => {
        const icon = icons[i % icons.length];
        return (
          <BackgroundElement
            key={crypto.getRandomValues(new Uint32Array(1))[0]}
            icon={icon || '404'}
          />
        );
      })}
    </div>
  );
}

const BackgroundElement = ({ icon }: { icon: string }) => {
  const [left, setLeft] = useState(100);
  const [top, setTop] = useState(100);
  const [animationDelay, setAnimationDelay] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLeft(Math.random() * 100);
      setTop(Math.random() * 100);
      setAnimationDelay(Math.random() * 5);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute animate-fade-in"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        animationDelay: `${animationDelay}s`,
        opacity: 0.1,
      }}
    >
      {icon}
    </div>
  );
};
