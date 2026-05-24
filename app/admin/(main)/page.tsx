import { createClient as createServerClient } from '@supabase/supabase-js'
import AdminDashboard from './AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: totalVotes },
    { count: totalComments },
    { count: totalIssues },
    { count: activeIssues },
    { count: todayVotes },
    { count: weekVotes },
    { count: todayComments },
    { count: weekComments },
    { data: issues },
    { data: comments },
    { data: recentVoteTs },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('votes').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('issues').select('*', { count: 'exact', head: true }),
    supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('votes').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('votes').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).eq('is_deleted', false),
    supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', weekStart).eq('is_deleted', false),
    supabase.from('issues').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('comments')
      .select('id, content, vote_type, likes, created_at, user_id, issue_id, issues(id, title)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('votes').select('created_at').gte('created_at', last30Start),
  ])

  // 최근 30일 일별 투표 집계
  const votesByDay: Record<string, number> = {}
  for (const v of recentVoteTs ?? []) {
    const day = (v.created_at as string).slice(0, 10)
    votesByDay[day] = (votesByDay[day] ?? 0) + 1
  }
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const chartData = last14Days.map(day => ({ date: day, count: votesByDay[day] ?? 0 }))

  const stats = {
    totalUsers: totalUsers ?? 0,
    totalVotes: totalVotes ?? 0,
    totalComments: totalComments ?? 0,
    totalIssues: totalIssues ?? 0,
    activeIssues: activeIssues ?? 0,
    closedIssues: (totalIssues ?? 0) - (activeIssues ?? 0),
    todayVotes: todayVotes ?? 0,
    weekVotes: weekVotes ?? 0,
    todayComments: todayComments ?? 0,
    weekComments: weekComments ?? 0,
    chartData,
  }

  return (
    <AdminDashboard
      stats={stats}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      issues={(issues ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comments={(comments ?? []) as any[]}
    />
  )
}
