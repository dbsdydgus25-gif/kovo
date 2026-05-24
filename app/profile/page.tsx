import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import ProfileClient from './ProfileClient'
import ProfileLoginPrompt from './ProfileLoginPrompt'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-dvh bg-[#F5F5F7]">
        <TopBar title="내 정보" />
        <div className="flex items-center justify-center pt-[56px]" style={{ minHeight: '100dvh' }}>
          <ProfileLoginPrompt />
        </div>
        <BottomNav />
      </div>
    )
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

  const { data: rawComments } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      vote_type,
      likes,
      created_at,
      issue_id,
      issues (
        id,
        title,
        category
      )
    `)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const votes = (rawVotes ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myComments = (rawComments ?? []) as any[]

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="내 정보" />
      <div className="pt-[72px] pb-[84px]">
        <ProfileClient
          user={user}
          votes={votes}
          myComments={myComments}
          displayName={profile?.display_name ?? null}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          savedTendency={(profile as any)?.tendency_data ?? null}
        />
      </div>
      <BottomNav />
    </div>
  )
}
