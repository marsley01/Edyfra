import LoginForm from './login-form'

import { authErrorMessage, isGoogleSignInEnabled } from '@/lib/google-auth'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const params = await searchParams
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error
  const initialError = authErrorMessage(rawError)

  return <LoginForm googleEnabled={await isGoogleSignInEnabled()} initialError={initialError} />
}
