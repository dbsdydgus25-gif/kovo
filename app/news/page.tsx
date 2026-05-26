import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { formatRelativeTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface NewsItem {
  id: string
  title: string
  link: string | null
  pub_date: string
  source: string
}

const FALLBACK_NEWS: NewsItem[] = [
  { id: '1', title: '국회, 반도체 특별법 본회의 통과…산업 경쟁력 강화 기대', link: null, pub_date: new Date(Date.now() - 1000 * 60 * 40).toISOString(), source: '연합뉴스' },
  { id: '2', title: '여야, 최저임금 인상폭 놓고 팽팽한 줄다리기', link: null, pub_date: new Date(Date.now() - 1000 * 60 * 90).toISOString(), source: 'KBS' },
  { id: '3', title: '정부, 의대 정원 2,000명 증원 방침 재확인', link: null, pub_date: new Date(Date.now() - 1000 * 60 * 150).toISOString(), source: 'MBC' },
  { id: '4', title: '군 복무 단축 법안, 국방위 소위서 논의 시작', link: null, pub_date: new Date(Date.now() - 1000 * 60 * 210).toISOString(), source: '한겨레' },
  { id: '5', title: '출산장려금 현실화 법안 발의…육아부담 경감 목표', link: null, pub_date: new Date(Date.now() - 1000 * 60 * 300).toISOString(), source: '조선일보' },
]

export default async function NewsPage() {
  let news: NewsItem[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('news')
      .select('id, title, link, pub_date, source')
      .order('pub_date', { ascending: false })
      .limit(30)

    news = (data ?? []) as NewsItem[]
    if (news.length === 0) news = FALLBACK_NEWS
  } catch {
    news = FALLBACK_NEWS
  }

  const updatedAt = news[0]?.pub_date

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="정치 뉴스" />

      <div className="pt-[72px] pb-[84px] px-4 space-y-3">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#C60C30] animate-pulse" />
            <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">Live</span>
            {updatedAt && (
              <span className="text-[11px] text-gray-300 ml-auto">
                {formatRelativeTime(updatedAt)} 업데이트
              </span>
            )}
          </div>
          <h2 className="text-[16px] font-black text-[#1C1917]">오늘의 정치 뉴스</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">주요 언론사 정치 섹션 · 매일 오전 9시 업데이트</p>
        </div>

        {/* News list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {news.map((item, idx) => (
            <a
              key={item.id}
              href={item.link ?? undefined}
              target={item.link ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-4 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-[11px] font-black text-gray-500">{idx + 1}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#1C1917] leading-snug mb-1.5">{item.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#0038A8] bg-blue-50 px-1.5 py-0.5 rounded">{item.source}</span>
                  <span className="text-[11px] text-gray-400">{formatRelativeTime(item.pub_date)}</span>
                </div>
              </div>
              {item.link && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-1">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </a>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          매일 오전 9시 자동 업데이트 · 언론사 원문 링크 제공
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
