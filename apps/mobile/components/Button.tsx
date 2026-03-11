import { forwardRef } from 'react'
import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native'
import { Text, makeStyles } from 'theme'

type ButtonProps = {
  isLoading?: boolean
  title?: string
  testID?: string
} & PressableProps

export const Button = forwardRef<View, ButtonProps>(
  ({ title, children, isLoading, ...pressableProps }, ref) => {
    const styles = useStyles()

    return (
      <Pressable ref={ref} {...pressableProps} style={[styles.button, pressableProps.style as object]}>
        <Text variant="label" textAlign="center" color="foreground" fontWeight="600">
          {(typeof children === 'string' ? children : title)?.toUpperCase()}
        </Text>
        {isLoading ? <ActivityIndicator color={styles.loader.color} size="small" /> : null}
      </Pressable>
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
    minHeight: 44,
    paddingVertical: theme.spacing.sm_12,
    paddingHorizontal: theme.spacing.m_16,
  },
  loader: {
    color: theme.colors.foreground,
  },
}))
