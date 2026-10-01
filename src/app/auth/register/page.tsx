import RegisterForm from './register-form'
import { isGoogleSignInEnabled } from '@/lib/google-auth'

export default function RegisterPage() {
  return <RegisterForm googleEnabled={isGoogleSignInEnabled()} />
}
