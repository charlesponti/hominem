import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { GripVertical, PanelLeftClose, PanelRightClose } from 'lucide-react';

import { Button } from '@hominem/ui/button';
import { cn } from '@hominem/ui/lib/utils';

interface SplitPaneProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultSplit?: number;
  minWidth?: number;
  storageKey?: string;
  className?: string;
}

export function SplitPane({
  leftPanel,
  rightPanel,
  defaultSplit = 50,
  minWidth = 300,
  storageKey = 'notes-split-position',
  className,
}: SplitPaneProps) {
  const [splitPosition, setSplitPosition] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const [_isCollapsed, _setIsCollapsed] = useState(false);
  const [collapsedSide, setCollapsedSide] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100) {
        setSplitPosition(parsed);
      }
    }
  }, [storageKey]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const container = document.getElementById('split-pane-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      const minPercent = (minWidth / rect.width) * 100;

      if (newPosition >= minPercent && newPosition <= 100 - minPercent) {
        setSplitPosition(newPosition);
        localStorage.setItem(storageKey, String(Math.round(newPosition)));
      }
    },
    [isDragging, minWidth, storageKey],
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = useCallback(() => {
    setSplitPosition(defaultSplit);
    localStorage.setItem(storageKey, String(defaultSplit));
  }, [defaultSplit, storageKey]);

  const toggleCollapseLeft = useCallback(() => {
    if (collapsedSide === 'left') {
      setCollapsedSide(null);
    } else {
      setCollapsedSide('left');
    }
  }, [collapsedSide]);

  const toggleCollapseRight = useCallback(() => {
    if (collapsedSide === 'right') {
      setCollapsedSide(null);
    } else {
      setCollapsedSide('right');
    }
  }, [collapsedSide]);

  return (
    <div id="split-pane-container" className={cn('flex h-full w-full', className)}>
      {/* Left Panel */}
      <div
        className={cn(
          'h-full overflow-hidden transition-all duration-200',
          collapsedSide === 'left' ? 'w-0' : collapsedSide === 'right' ? 'flex-1' : 'border-r',
        )}
        style={
          collapsedSide === null
            ? { width: `${splitPosition}%` }
            : collapsedSide === 'right'
              ? {}
              : { width: '0%' }
        }
      >
        {collapsedSide !== 'left' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-2 py-1 border-b">
              <span className="text-xs text-muted-foreground">Note</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={toggleCollapseLeft}
                title="Collapse note panel"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">{leftPanel}</div>
          </div>
        )}
      </div>

      {/* Divider */}
      {collapsedSide === null && (
        <div
          className={cn(
            'relative flex items-center justify-center w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors',
            isDragging && 'bg-primary',
          )}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <GripVertical className="size-3 text-muted-foreground opacity-50" />
        </div>
      )}

      {/* Right Panel */}
      <div
        className={cn(
          'h-full overflow-hidden transition-all duration-200',
          collapsedSide === 'right' ? 'w-0' : collapsedSide === 'left' ? 'flex-1' : 'border-l',
        )}
        style={
          collapsedSide === null
            ? { width: `${100 - splitPosition}%` }
            : collapsedSide === 'left'
              ? {}
              : { width: '0%' }
        }
      >
        {collapsedSide !== 'right' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-2 py-1 border-b">
              <span className="text-xs text-muted-foreground">Chat</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={toggleCollapseRight}
                title="Collapse chat panel"
              >
                <PanelRightClose className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">{rightPanel}</div>
          </div>
        )}
      </div>

      {/* Expand buttons when collapsed */}
      {collapsedSide === 'left' && (
        <Button
          variant="outline"
          size="sm"
          className="absolute left-2 top-1/2 -translate-y-1/2"
          onClick={toggleCollapseLeft}
          title="Show note panel"
        >
          <PanelLeftClose className="size-4 rotate-180" />
        </Button>
      )}
      {collapsedSide === 'right' && (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={toggleCollapseRight}
          title="Show chat panel"
        >
          <PanelRightClose className="size-4 rotate-180" />
        </Button>
      )}
    </div>
  );
}
