import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await isAdminAuthenticated()
  if (!auth) {
    redirect('/admin/login')
  }
  return <>{children}</>
}
