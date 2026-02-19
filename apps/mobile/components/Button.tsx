import { forwardRef, type ElementRef } from 'react'
import { ActivityIndicator, TouchableOpacity, type TouchableOpacityProps } from 'react-native'
import { Text, makeStyles } from 'theme'

type ButtonProps = {
  isLoading?: boolean
  title?: string
  testID?: string
} & TouchableOpacityProps

export const Button = forwardRef<ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ title, children, isLoading, ...touchableProps }, ref) => {
    const styles = useStyles()

    return (
      <TouchableOpacity ref={ref} {...touchableProps} style={[styles.button, touchableProps.style]}>
        <Text variant="label" textAlign="center" color="foreground" fontWeight="600">
          {(typeof children === 'string' ? children : title)?.toUpperCase()}
        </Text>
        {isLoading && <ActivityIndicator color={styles.loader.color} size="small" />}
      </TouchableOpacity>
    )
  }
)

const useStyles = makeStyles((theme) => ({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    columnGap: theme.spacing.sm_12,
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm_12,
    paddingHorizontal: theme.spacing.m_16,
  },
  loader: {
    color: theme.colors.foreground,
  },
}))
