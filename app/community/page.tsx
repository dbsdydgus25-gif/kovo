import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import SearchButton from '@/components/SearchButton'
import { createClient } from '@/lib/supabase/server'
import CommunityClient from './CommunityClient'
import { formatRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// formatRelativeTime is used in CommunityClient
void formatRelativeTime

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

export default async function CommunityPage() {
  let news: NewsItem[] = []
  let userId: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null

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

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar
        title="커뮤니티"
        leftAction={<SearchButton />}
      />

      <div className="pt-[72px] pb-[84px] px-4 space-y-3">
        <CommunityClient initialNews={news} userId={userId} />
      </div>

      <BottomNav />
    </div>
  )
}
