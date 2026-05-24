import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import LoginButton from '@/components/LoginButton'
import { formatNumber, getVotePercentage, CATEGORY_COLORS } from '@/lib/utils'
import { Issue } from '@/types'
import Link from 'next/link'
import { MOCK_ISSUES } from '@/lib/mock-data'

const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  let typedIssues: Issue[] = []
  let todayVotes = 0
  let weekVotes = 0
  let todayComments = 0
  let weekComments = 0
  let totalVotesDB = 0
  let totalCommentsDB = 0
  let isLoggedIn = false

  if (IS_DEMO) {
    typedIssues = [...MOCK_ISSUES].sort((a, b) => (b.agree_count + b.disagree_count) - (a.agree_count + a.disagree_count))
    const total = typedIssues.reduce((s, i) => s + i.agree_count + i.disagree_count, 0)
    todayVotes = Math.round(total * 0.08)
    weekVotes = Math.round(total * 0.42)
    todayComments = Math.round(typedIssues.reduce((s, i) => s + i.comment_count, 0) * 0.1)
    weekComments = Math.round(typedIssues.reduce((s, i) => s + i.comment_count, 0) * 0.55)
    totalVotesDB = total
    totalCommentsDB = typedIssues.reduce((s, i) => s + i.comment_count, 0)
    isLoggedIn = true // demo always shows
  } else {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      isLoggedIn = !!user

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [
        { data: issues },
        { count: tv },
        { count: wv },
        { count: tc },
        { count: wc },
        { count: totalV },
        { count: totalC },
      ] = await Promise.all([
        supabase.from('issues').select('*').order('agree_count', { ascending: false }).limit(5),
        supabase.from('votes').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('votes').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).eq('is_deleted', false),
        supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', weekStart).eq('is_deleted', false),
        supabase.from('votes').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      ])

      typedIssues = (issues ?? []) as Issue[]
      todayVotes = tv ?? 0
      weekVotes = wv ?? 0
      todayComments = tc ?? 0
      weekComments = wc ?? 0
      totalVotesDB = totalV ?? 0
      totalCommentsDB = totalC ?? 0
    } catch {
      typedIssues = [...MOCK_ISSUES]
    }
  }

  const hotIssue = typedIssues[0] ?? null
  const { agree: hotAgree, disagree: hotDisagree, total: hotTotal } = hotIssue
    ? getVotePercentage(hotIssue.agree_count, hotIssue.disagree_count)
    : { agree: 0, disagree: 0, total: 0 }

  const totalVotesFromIssues = typedIssues.reduce((sum, i) => sum + i.agree_count + i.disagree_count, 0)

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="인사이트" />

      <div className="pt-[72px] pb-[84px] px-4 space-y-3">

        {/* 비로그인 블러 오버레이 */}
        {!isLoggedIn ? (
          <div className="relative">
            {/* 블러 콘텐츠 */}
            <div className="space-y-3 pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.6 }}>
              {hotIssue && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0038A8 0%, #1a56d6 60%, #003b93 100%)' }}>
                  <div className="p-4">
                    <p className="text-[16px] font-black text-white leading-snug mb-3">샘플 논제 제목입니다</p>
                    <div className="h-2 rounded-full overflow-hidden flex bg-white/20 mb-2">
                      <div className="h-full rounded-l-full" style={{ width: '62%', background: 'rgba(255,255,255,0.9)' }} />
                      <div className="h-full rounded-r-full" style={{ width: '38%', background: '#C60C30' }} />
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="font-bold text-white">찬 62%</span>
                      <span className="text-white/60">1,234명 참여</span>
                      <span className="font-bold text-[#ff8a8a]">반 38%</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="text-[11px] text-gray-400 mb-2 font-semibold">오늘 투표</div>
                  <div className="text-[22px] font-black text-[#0038A8]">---</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="text-[11px] text-gray-400 mb-2 font-semibold">오늘 댓글</div>
                  <div className="text-[22px] font-black text-[#C60C30]">---</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>

            {/* 잠금 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(245,245,247,0.7)', backdropFilter: 'blur(4px)' }}>
              <div className="text-center px-8 py-10">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="#0038A8" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="#0038A8" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-[18px] font-black text-[#1C1917] mb-2">로그인 후 확인하세요</h2>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
                  투표 현황, 인기 논제, 분야별<br/>통계를 확인할 수 있어요
                </p>
                <div className="flex justify-center">
                  <LoginButton />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Today's hot issue */}
            {hotIssue && (
              <Link href={`/issue/${hotIssue.id}`} className="block">
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0038A8 0%, #1a56d6 60%, #003b93 100%)' }}>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#C60C30] animate-pulse" />
                      <span className="text-[11px] font-bold text-white/70 tracking-widest uppercase">가장 뜨거운 논제</span>
                    </div>
                    <p className="text-[16px] font-black text-white leading-snug mb-3">{hotIssue.title}</p>
                    <div className="h-2 rounded-full overflow-hidden flex bg-white/20 mb-2">
                      <div className="h-full rounded-l-full" style={{ width: `${hotAgree}%`, background: 'rgba(255,255,255,0.9)' }} />
                      <div className="h-full rounded-r-full" style={{ width: `${hotDisagree}%`, background: '#C60C30' }} />
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="font-bold text-white">찬 {hotAgree}%</span>
                      <span className="text-white/60">{formatNumber(hotTotal)}명 참여</span>
                      <span className="font-bold text-[#ff8a8a]">반 {hotDisagree}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Today / week stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="text-[11px] text-gray-400 mb-2 font-semibold">오늘 투표</div>
                <div className="text-[22px] font-black text-[#0038A8]">{formatNumber(todayVotes)}</div>
                <div className="text-[11px] text-gray-300 mt-0.5">이번 주 {formatNumber(weekVotes)}표</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="text-[11px] text-gray-400 mb-2 font-semibold">오늘 댓글</div>
                <div className="text-[22px] font-black text-[#C60C30]">{formatNumber(todayComments)}</div>
                <div className="text-[11px] text-gray-300 mt-0.5">이번 주 {formatNumber(weekComments)}개</div>
              </div>
            </div>

            {/* Summary totals — from votes table directly */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="text-[11px] text-gray-400 mb-1">누적 투표수</div>
                <div className="text-[24px] font-black text-[#0038A8]">{formatNumber(totalVotesDB)}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">명이 참여</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="text-[11px] text-gray-400 mb-1">누적 댓글수</div>
                <div className="text-[24px] font-black text-[#C60C30]">{formatNumber(totalCommentsDB)}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">개 의견</div>
              </div>
            </div>

            {/* Hot issues ranking - Top 5 */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <h3 className="text-[15px] font-bold text-[#1C1917]">🔥 오늘의 논제 TOP 5</h3>
                <p className="text-[12px] text-[#78716C] mt-0.5">투표 참여가 가장 많은 안건</p>
              </div>

              {typedIssues.map((issue, idx) => {
                const { agree, disagree, total } = getVotePercentage(issue.agree_count, issue.disagree_count)
                const catColor = CATEGORY_COLORS[issue.category] ?? '#6B7280'
                const gap = Math.abs(agree - disagree)
                const isTight = gap < 10

                return (
                  <Link
                    key={issue.id}
                    href={`/issue/${issue.id}`}
                    className="block px-4 py-3.5 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[13px] font-black text-gray-500">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: `${catColor}18`, color: catColor }}>
                            {issue.category}
                          </span>
                          {isTight && total > 0 && (
                            <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                              박빙
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] font-semibold text-[#1C1917] line-clamp-1 mb-2">{issue.title}</p>
                        {total > 0 ? (
                          <>
                            <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
                              <div className="h-full vote-bar" style={{ width: `${agree}%`, background: '#0038A8' }} />
                              <div className="h-full" style={{ width: `${disagree}%`, background: '#C60C30' }} />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[11px] font-semibold text-[#0038A8]">찬 {agree}%</span>
                              <span className="text-[10px] text-gray-400">{formatNumber(total)}명</span>
                              <span className="text-[11px] font-semibold text-[#C60C30]">반 {disagree}%</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-[11px] text-gray-300">아직 투표 없음</p>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <h3 className="text-[15px] font-bold text-[#1C1917]">분야별 관심도</h3>
              </div>
              <div className="p-4 space-y-3">
                {Object.entries(CATEGORY_COLORS).filter(([cat]) => cat !== '공통').map(([cat, color]) => {
                  const catIssues = typedIssues.filter(i => i.category === cat)
                  const catVotes = catIssues.reduce((s, i) => s + i.agree_count + i.disagree_count, 0)
                  if (catVotes === 0) return null
                  const pct = totalVotesFromIssues > 0 ? Math.round((catVotes / totalVotesFromIssues) * 100) : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span style={{ color }} className="font-semibold">{cat}</span>
                        <span className="text-gray-400">{formatNumber(catVotes)}표 ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full vote-bar" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
