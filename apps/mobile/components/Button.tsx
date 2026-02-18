import { forwardRef } from 'react'
import { ActivityIndicator, TouchableOpacity, type TouchableOpacityProps } from 'react-native'
import { Text, makeStyles } from 'theme'

type ButtonProps = {
  isLoading?: boolean
  title?: string
} & TouchableOpacityProps

export const Button = forwardRef<TouchableOpacity, ButtonProps>(
  ({ title, children, isLoading, ...touchableProps }, ref) => {
    const styles = useStyles()

    return (
      <TouchableOpacity ref={ref} {...touchableProps} style={[styles.button, touchableProps.style]}>
        <Text variant="body" textAlign="center" color="white" fontWeight="600">
          {children || title}
        </Text>
        {isLoading && <ActivityIndicator color="white" size="small" />}
      </TouchableOpacity>
    )
  }
)

const useStyles = makeStyles((theme) => ({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.black,
    borderRadius: theme.borderRadii.l_12,
    elevation: 5,
    flexDirection: 'row',
    columnGap: theme.spacing.m_16,
    justifyContent: 'center',
    padding: theme.spacing.m_16,
    shadowColor: theme.colors.black,
    shadowOffset: {
      height: 2,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
}))
