import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import type { ReactNode } from 'react'
import { CopyButton } from '~/components/copy-button'

interface StrategySectionProps {
  title: string
  children: ReactNode
  onCopy?: () => void
  sectionName?: string
  copiedSections?: Set<string>
  showCopyButton?: boolean
  sectionId?: string
  shortcutKey?: string
  level?: 2 | 3 | 4
}

export function StrategySection({
  title,
  children,
  onCopy,
  sectionName,
  copiedSections = new Set(),
  showCopyButton = false,
  sectionId,
  shortcutKey,
  level = 2,
}: StrategySectionProps) {
  const headingId = sectionId || title.toLowerCase().replace(/\s+/g, '-')
  const contentId = `${headingId}-content`

  const renderHeading = () => {
    const headingProps = {
      id: headingId,
      className: 'text-lg font-semibold',
      tabIndex: -1,
    }

    switch (level) {
      case 2:
        return <h2 {...headingProps}>{title}</h2>
      case 3:
        return <h3 {...headingProps}>{title}</h3>
      case 4:
        return <h4 {...headingProps}>{title}</h4>
      default:
        return <h2 {...headingProps}>{title}</h2>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{renderHeading()}</CardTitle>
          {showCopyButton && onCopy && sectionName && (
            <CopyButton
              onClick={onCopy}
              sectionName={sectionName}
              copiedSections={copiedSections}
              shortcutKey={shortcutKey}
              aria-describedby={contentId}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <section id={contentId} aria-labelledby={headingId}>
          {children}
        </section>
      </CardContent>
    </Card>
  )
}
