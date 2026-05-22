import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import VoteSection from '@/components/VoteSection'
import InsightsChart from '@/components/InsightsChart'
import CommentSection from '@/components/CommentSection'
import ShareButton from '@/components/ShareButton'
import { Issue, VoteType, DemographicInsight } from '@/types'
import { CATEGORY_COLORS } from '@/lib/utils'
import { MOCK_ISSUES } from '@/lib/mock-data'

const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ _dv?: string }>
}

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대', '60대이상']
const GENDERS = ['남성', '여성', '기타', '응답거부']
const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '그외']
const OCCUPATIONS = ['학생', '직장인', '자영업', '전문직', '공무원', '주부', '기타']

function buildInsights(
  votes: Array<{ vote_type: string; age_group: string | null; gender: string | null; region: string | null; occupation: string | null }>,
  groups: string[],
  key: 'age_group' | 'gender' | 'region' | 'occupation'
): DemographicInsight[] {
  return groups.map(label => {
    const filtered = votes.filter(v => v[key] === label)
    const agree = filtered.filter(v => v.vote_type === 'agree').length
    const disagree = filtered.filter(v => v.vote_type === 'disagree').length
    return { label, agree, disagree, total: agree + disagree }
  })
}

export default async function IssuePage({ params, searchParams }: Props) {
  const { id } = await params
  const { _dv } = await searchParams

  let typedIssue: Issue | null = null
  let userVote: VoteType | null = null
  let user = null
  let votes: Array<{ vote_type: string; age_group: string | null; gender: string | null; region: string | null; occupation: string | null }> = []

  if (IS_DEMO) {
    typedIssue = MOCK_ISSUES.find(i => i.id === id) ?? null
    if (_dv === 'agree' || _dv === 'disagree') userVote = _dv
    // Mock demographic data for demo
    if (typedIssue) {
      const total = typedIssue.agree_count + typedIssue.disagree_count
      const agePcts = [0.12, 0.22, 0.28, 0.21, 0.11, 0.06]
      const ageGroups = ['10대', '20대', '30대', '40대', '50대', '60대이상']
      agePcts.forEach((pct, i) => {
        const n = Math.round(total * pct)
        const agreeRatio = typedIssue!.agree_count / total
        for (let j = 0; j < n; j++) {
          votes.push({ vote_type: j < n * agreeRatio ? 'agree' : 'disagree', age_group: ageGroups[i], gender: j % 2 === 0 ? '남성' : '여성', region: ['서울', '경기', '부산', '인천'][j % 4], occupation: ['직장인', '학생', '자영업', '공무원'][j % 4] })
        }
      })
    }
  } else {
    try {
      const supabase = await createClient()
      const [{ data: issue }, { data: { user: u } }] = await Promise.all([
        supabase.from('issues').select('*').eq('id', id).single(),
        supabase.auth.getUser(),
      ])
      typedIssue = issue as Issue ?? null
      user = u

      if (user) {
        const { data: vote } = await supabase
          .from('votes').select('vote_type').eq('issue_id', id).eq('user_id', user.id).single()
        userVote = (vote?.vote_type as VoteType) ?? null
      }

      // votes 테이블에는 인구통계 없음 — profiles와 JOIN
      const { data: rawVotes } = await supabase
        .from('votes').select('vote_type, user_id').eq('issue_id', id)

      if (rawVotes && rawVotes.length > 0) {
        const userIds = rawVotes.map(v => v.user_id)
        const { data: profiles } = await supabase
          .from('profiles').select('id, age_group, gender, region, occupation')
          .in('id', userIds)
        const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
        votes = rawVotes.map(v => ({
          vote_type: v.vote_type,
          age_group: profileMap[v.user_id]?.age_group ?? null,
          gender: profileMap[v.user_id]?.gender ?? null,
          region: profileMap[v.user_id]?.region ?? null,
          occupation: profileMap[v.user_id]?.occupation ?? null,
        }))
      }
    } catch {
      typedIssue = MOCK_ISSUES.find(i => i.id === id) ?? null
    }
  }

  if (!typedIssue) notFound()

  const catColor = CATEGORY_COLORS[typedIssue.category] ?? '#6B7280'
  const totalVotes = typedIssue.agree_count + typedIssue.disagree_count

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar showBack title={typedIssue.category} rightAction={<ShareButton title={typedIssue.title} />} />

      <div className="pt-[72px] pb-[84px] px-4 space-y-3">
        {/* Issue header card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${catColor}18`, color: catColor }}
            >
              {typedIssue.category}
            </span>
            {typedIssue.featured && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                🔥 주목
              </span>
            )}
            <span className="text-[11px] text-gray-400 ml-auto">
              {new Date(typedIssue.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>

          <h1 className="text-[18px] font-black text-[#1C1917] leading-snug mb-3">
            {typedIssue.title}
          </h1>

          <p className="text-[14px] text-[#78716C] leading-relaxed">
            {typedIssue.summary}
          </p>

          {typedIssue.description && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-[13px] text-[#9CA3AF] leading-relaxed">
                {typedIssue.description}
              </p>
            </div>
          )}

          {typedIssue.bill_no && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] text-gray-400">의안번호</span>
              <span className="text-[11px] font-mono text-[#0038A8] bg-blue-50 px-2 py-0.5 rounded">
                {typedIssue.bill_no}
              </span>
              {typedIssue.source_url && (
                <a
                  href={typedIssue.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#0038A8] ml-auto"
                >
                  국회 원문 →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Vote section */}
        <VoteSection
          issue={typedIssue}
          userVote={userVote}
          userId={user?.id ?? null}
        />

        {/* 인사이트 — 투표 후에만 공개 */}
        {userVote ? (
          <InsightsChart
            byAge={buildInsights(votes, AGE_GROUPS, 'age_group')}
            byGender={buildInsights(votes, GENDERS, 'gender')}
            byRegion={buildInsights(votes, REGIONS, 'region')}
            byOccupation={buildInsights(votes, OCCUPATIONS, 'occupation')}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#D1D5DB" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[14px] font-bold text-[#1C1917]">투표 후 인사이트 공개</p>
            <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">
              연령·성별·지역·직업별 분포와<br/>발의 정당 정보는 투표 후 확인할 수 있어요
            </p>
          </div>
        )}

        {/* Comments */}
        <CommentSection
          issueId={id}
          userId={user?.id ?? null}
          userVote={userVote}
        />
      </div>

      <BottomNav />
    </div>
  )
}
