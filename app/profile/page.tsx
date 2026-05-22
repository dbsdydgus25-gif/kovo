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

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, age_group, gender, region, occupation, tendency_data, tendency_updated_at')
    .eq('id', user.id)
    .single()

  const { data: rawVotes } = await supabase
    .from('votes')
    .select(`
      vote_type,
      created_at,
      issue_id,
      issues (
        id,
        title,
        category,
        agree_count,
        disagree_count
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const votes = (rawVotes ?? []) as any[]

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="내 정보" />
      <div className="pt-[72px] pb-[84px]">
        <ProfileClient
          user={user}
          votes={votes}
          displayName={profile?.display_name ?? null}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          savedTendency={(profile as any)?.tendency_data ?? null}
        />
      </div>
      <BottomNav />
    </div>
  )
}
