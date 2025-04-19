import clsx from 'clsx'
import type React from 'react'

import styles from './AuthWrap.module.css'

function AuthWrap({
  children,
  ...props
}: React.PropsWithChildren<React.HTMLProps<HTMLDivElement>>) {
  return (
    <div {...props} className={clsx(styles.wrap, props.className)}>
      {children}
    </div>
  )
}

export default AuthWrap
