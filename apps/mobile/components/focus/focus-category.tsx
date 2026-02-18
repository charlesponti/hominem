import { Text, theme } from '~/theme'

export const FocusCategory = ({ category }: { category: keyof CategoryMap }) => {
  const foundCategory = CATEGORIES[category]

  if (!foundCategory) {
    return (
      <Text variant="small" style={{ color: '#BDBDBD' }}>
        {`🤷 ${category}`}
      </Text>
    )
  }

  return (
    <Text variant="small" style={{ color: theme.colors.black }}>
      {`${foundCategory.emoji} ${foundCategory.label}`}
    </Text>
  )
}

export const CATEGORIES: Record<string, { emoji: string; label: string }> = {
  career: {
    emoji: '💼',
    label: 'Career',
  },
  personal_development: {
    emoji: '🌱',
    label: 'Personal',
  },
  physical_health: {
    emoji: '💪',
    label: 'Physical health',
  },
  mental_health: {
    emoji: '🧠',
    label: 'Mental health',
  },
  finance: {
    emoji: '💰',
    label: 'Finance',
  },
  education: {
    emoji: '📚',
    label: 'Education',
  },
  relationships: {
    emoji: '❤️',
    label: 'Social',
  },
  home: {
    emoji: '🏠',
    label: 'Home',
  },
  interests: {
    emoji: '🌟',
    label: 'Interests',
  },
  adventure: {
    emoji: '✈️',
    label: 'Adventure',
  },
  technology: {
    emoji: '💻',
    label: 'Tech',
  },
  spirituality: {
    emoji: '🙏',
    label: 'Spirituality',
  },
  productivity: {
    emoji: '⏱️',
    label: 'Productivity',
  },
  creativity: {
    emoji: '🎨',
    label: 'Creativity',
  },
  culture: {
    emoji: '🎭',
    label: 'Culture',
  },
  legal: {
    emoji: '⚖️',
    label: 'Legal',
  },
  events: {
    emoji: '📆',
    label: 'Events',
  },
  projects: {
    emoji: '🧩',
    label: 'Projects',
  },
}

type CategoryMap = typeof CATEGORIES
