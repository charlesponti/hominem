import { Phone } from 'lucide-react'

interface PlacePhoneProps {
  phoneNumber: string
}

export default function PlacePhone({ phoneNumber }: PlacePhoneProps) {
  if (!phoneNumber) { return null }
  return (
    <a
      href={`tel:${phoneNumber}`}
      className="flex items-center gap-2 text-primary hover:text-indigo-600 text-sm font-semilight transition-colors"
    >
      <Phone size={14} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">{phoneNumber}</div>
    </a>
  )
}
