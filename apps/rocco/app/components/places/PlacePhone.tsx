import { Phone } from 'lucide-react'

interface PlacePhoneProps {
  phoneNumber: string
}

export default function PlacePhone({ phoneNumber }: PlacePhoneProps) {
  if (!phoneNumber) return null
  return (
    <div className="flex items-start gap-3">
      <Phone size={18} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <a
          href={`tel:${phoneNumber}`}
          className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
        >
          {phoneNumber}
        </a>
      </div>
    </div>
  )
}
