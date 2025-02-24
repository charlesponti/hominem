const emailFeedback = {
  empty: "Email can't be empty",
  invalid: 'Email is invalid',
  noAtSymbol: 'Email must contain @ symbol',
}

export function validateEmail(email: string) {
  if (email === '') {
    return emailFeedback.empty
  }
  if (email.indexOf('@') === -1) {
    return emailFeedback.noAtSymbol
  }
  if (!/.+@.+\..+/.test(email)) {
    return emailFeedback.invalid
  }
  return null
}

export default { validateEmail }
