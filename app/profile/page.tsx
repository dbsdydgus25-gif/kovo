import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="내 정보" />
      <div className="pt-[72px] pb-[84px]">
        <ProfileClient user={user} />
      </div>
      <BottomNav />
    </div>
  )
}
