import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { formatRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 1800

interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
}

const MOCK_NEWS: NewsItem[] = [
  { title: '국회, 반도체 특별법 본회의 통과…산업 경쟁력 강화 기대', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 40).toISOString(), source: '연합뉴스' },
  { title: '여야, 최저임금 인상폭 놓고 팽팽한 줄다리기', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 90).toISOString(), source: 'KBS' },
  { title: '정부, 의대 정원 2,000명 증원 방침 재확인', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 150).toISOString(), source: 'MBC' },
  { title: '군 복무 단축 법안, 국방위 소위서 논의 시작', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 210).toISOString(), source: '한겨레' },
  { title: '출산장려금 현실화 법안 발의…육아부담 경감 목표', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 300).toISOString(), source: '조선일보' },
  { title: '야당, 대통령 탄핵 청문회 재추진 예고', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 400).toISOString(), source: '경향신문' },
  { title: '전국 교원단체, 교육 예산 삭감 반발 시위 예고', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 500).toISOString(), source: '연합뉴스' },
  { title: '국민연금 개혁안, 소득대체율·보험료율 조율 막판 진통', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 600).toISOString(), source: 'KBS' },
  { title: '공매도 전면 재개 결정…개인투자자 반발 거세', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 720).toISOString(), source: '한국경제' },
  { title: '지방소멸 대응 특별법, 농어촌 의원 초당적 발의', link: '#', pubDate: new Date(Date.now() - 1000 * 60 * 900).toISOString(), source: 'MBC' },
]

const RSS_FEEDS = [
  { url: 'https://www.yonhapnews.co.kr/rss/politics.xml', source: '연합뉴스' },
  { url: 'https://rss.kbs.co.kr/rss/kbs_politics_0001.xml', source: 'KBS' },
]

function parseRssItem(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const match of itemMatches) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]
      || block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || '#'
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString()
    if (title) {
      items.push({ title: title.trim(), link: link.trim(), pubDate, source })
    }
    if (items.length >= 5) break
  }
  return items
}

async function fetchNews(): Promise<NewsItem[]> {
  try {
    const results = await Promise.allSettled(
      RSS_FEEDS.map(async ({ url, source }) => {
        const res = await fetch(url, {
          next: { revalidate: 1800 },
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VOICE-News/1.0)' },
          signal: AbortSignal.timeout(4000),
        })
        if (!res.ok) throw new Error('rss fetch failed')
        const text = await res.text()
        return parseRssItem(text, source)
      })
    )

    const allItems: NewsItem[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') allItems.push(...r.value)
    }

    if (allItems.length < 3) return MOCK_NEWS

    return allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  } catch {
    return MOCK_NEWS
  }
}

export default async function NewsPage() {
  const news = await fetchNews()

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="정치 뉴스" />

      <div className="pt-[72px] pb-[84px] px-4 space-y-3">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#C60C30] animate-pulse" />
            <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">Live</span>
          </div>
          <h2 className="text-[16px] font-black text-[#1C1917]">오늘의 정치 뉴스</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">주요 언론사 정치 섹션 실시간 업데이트</p>
        </div>

        {/* News list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {news.map((item, idx) => (
            <a
              key={idx}
              href={item.link === '#' ? undefined : item.link}
              target={item.link === '#' ? undefined : '_blank'}
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-4 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors block"
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-[11px] font-black text-gray-500">{idx + 1}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#1C1917] leading-snug mb-1.5">
                  {item.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#0038A8] bg-blue-50 px-1.5 py-0.5 rounded">
                    {item.source}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {formatRelativeTime(item.pubDate)}
                  </span>
                </div>
              </div>

              {item.link !== '#' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-1 text-gray-300">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </a>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          30분마다 자동 업데이트 · 언론사 원문 링크 제공
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
