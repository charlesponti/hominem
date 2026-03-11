import { StyleSheet } from 'react-native'
import { Text, theme } from '~/theme'

export const FocusCategory = ({ category }: { category: keyof CategoryMap }) => {
  const foundCategory = CATEGORIES[category]

  if (!foundCategory) {
    return (
      <Text variant="small" style={styles.muted}>
        {category}
      </Text>
    )
  }

  return (
    <Text variant="small" style={styles.secondary}>
      {foundCategory.label}
    </Text>
  )
}

const styles = StyleSheet.create({
  muted: { color: theme.colors['text-tertiary'] },
  secondary: { color: theme.colors['text-secondary'] },
})

export const CATEGORIES: Record<string, { label: string }> = {
  career: { label: 'Career' },
  personal_development: { label: 'Personal' },
  physical_health: { label: 'Physical health' },
  mental_health: { label: 'Mental health' },
  finance: { label: 'Finance' },
  education: { label: 'Education' },
  relationships: { label: 'Social' },
  home: { label: 'Home' },
  interests: { label: 'Interests' },
  adventure: { label: 'Adventure' },
  technology: { label: 'Tech' },
  spirituality: { label: 'Spirituality' },
  productivity: { label: 'Productivity' },
  creativity: { label: 'Creativity' },
  culture: { label: 'Culture' },
  legal: { label: 'Legal' },
  events: { label: 'Events' },
  projects: { label: 'Projects' },
}

type CategoryMap = typeof CATEGORIES
