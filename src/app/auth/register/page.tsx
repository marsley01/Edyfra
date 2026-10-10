import RegisterForm from './register-form'
import { isGoogleSignInEnabled } from '@/lib/google-auth'

export default async function RegisterPage() {
  return <RegisterForm googleEnabled={await isGoogleSignInEnabled()} />
}
