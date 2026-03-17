import { LinkIcon } from 'lucide-react'

interface PlaceWebsiteProps {
  website: string
}

export function PlaceWebsite({ website }: PlaceWebsiteProps) {
  return (
    <a
      href={website}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 text-primary text-sm font-semilight"
    >
      <LinkIcon size={14} className="inline-block" />
      {website.replace(/(^\w+:|^)\/\//, '').split('/')[0]}
    </a>
  )
}
