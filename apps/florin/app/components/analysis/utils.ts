// Utility function to get badge styles based on analysis key
export const getBadgeStyles = (key: string) => {
  switch (key) {
    case 'topics':
      return 'bg-violet-100 text-violet-700 hover:bg-violet-200'
    case 'entities':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    case 'sentiment':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
    case 'keywords':
      return 'bg-amber-100 text-amber-700 hover:bg-amber-200'
    case 'categories':
      return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
    case 'dates':
    case 'time':
      return 'bg-teal-100 text-teal-700 hover:bg-teal-200'
    case 'persons':
      return 'bg-rose-100 text-rose-700 hover:bg-rose-200'
    case 'locations':
      return 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
    case 'organizations':
      return 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }
}
