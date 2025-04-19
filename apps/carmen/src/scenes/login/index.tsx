import Alert from '@hominem/components/Alert'
import Button from '@hominem/components/Button'
import { LoadingScreen } from '@hominem/components/Loading'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useFormik } from 'formik'
import { Globe } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthWrap from 'src/components/AuthenticationWrap'
import api from 'src/lib/api'
import { useAuth } from 'src/lib/auth'
import * as Yup from 'yup'
import Authenticate from '../authenticate'

type LoginPayload = {
  email: string
}

const LoginSchema = Yup.object().shape({
  email: Yup.string().email(),
})

type LoginForm = {
  email: string
}

function Login() {
  const navigate = useNavigate()
  const { authState, isPending, setAuthState, user } = useAuth()
  const expiryDate = new Date(Date.now() + 1000 * 60 * 10)
  const form = useFormik<LoginForm>({
    initialValues: {
      email: authState?.loginEmail || '',
    },
    validationSchema: LoginSchema,
    onSubmit: (values) => {
      login.mutateAsync(values)
    },
  })
  const login = useMutation<void, AxiosError, LoginPayload, unknown>({
    mutationFn: async ({ email }) =>
      api
        .post('/login', { email }, { withCredentials: false })
        // Set email to be used during email code validation step
        .then(() => setAuthState({ loginEmail: email, expiryDate })),
    onError: (error) => {
      setAuthState({ loginEmail: '', expiryDate: null })
    },
  })

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  if (isPending) {
    return <LoadingScreen />
  }

  if (user) {
    return null
  }

  if (authState?.loginEmail) {
    return <Authenticate loginEmail={authState.loginEmail} setAuthState={setAuthState} />
  }

  return (
    <AuthWrap data-testid="login-page">
      <div className="flex justify-center text-primary font-extrabold mb-4 mt-24">
        <Globe size={150} className="animate-pulse" />
      </div>
      <form className="w-full" onSubmit={form.handleSubmit}>
        <div className="form-control w-full">
          <label className="label pl-0" htmlFor="email">
            <span className="label-text">What is your email?</span>
          </label>
          <input
            {...form.getFieldProps('email')}
            data-testid="email-input"
            className="input input-bordered w-full"
            type="email"
            placeholder="Email"
          />
        </div>
        <Button
          data-testid="login-button"
          type="submit"
          className="w-full mt-4"
          isLoading={login.status === 'pending'}
        >
          Get code
        </Button>
        {login.error && (
          <Alert type="error">
            <p className="mb-1">There was an issue logging you in.</p>
            <p className="text-sm">Our engineers are working on it. Please, try again later.</p>
          </Alert>
        )}
      </form>
    </AuthWrap>
  )
}

export default Login
