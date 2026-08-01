import { redirect } from "next/navigation"

export default function InstitutionsLoginRedirect() {
  redirect("/auth/institution-login")
}
