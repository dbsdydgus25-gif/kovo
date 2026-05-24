import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    const pwd = process.env.ADMIN_PASSWORD
    return !!pwd && !!token && token === pwd
  } catch {
    return false
  }
}

export function isAdminAuthenticatedFromRequest(req: NextRequest): boolean {
  const token = req.cookies.get('admin_token')?.value
  const pwd = process.env.ADMIN_PASSWORD
  return !!pwd && !!token && token === pwd
}
