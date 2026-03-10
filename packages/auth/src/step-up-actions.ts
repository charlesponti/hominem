export const STEP_UP_ACTIONS = {
  PASSKEY_REGISTER: 'passkey.register',
  PASSKEY_DELETE: 'passkey.delete',
  FINANCE_ACCOUNT_DELETE: 'finance.account.delete',
} as const

export type StepUpAction = (typeof STEP_UP_ACTIONS)[keyof typeof STEP_UP_ACTIONS]

export function isStepUpAction(value: string): value is StepUpAction {
  return Object.values(STEP_UP_ACTIONS).includes(value as StepUpAction)
}
