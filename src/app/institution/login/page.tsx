import { redirect } from 'next/navigation'

export default function InstitutionLoginRedirect() {
  redirect('/auth/institution-login')
}
