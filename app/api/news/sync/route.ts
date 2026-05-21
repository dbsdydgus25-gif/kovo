import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const RSS_FEEDS = [
  { url: 'https://news.google.com/rss/search?q=%EA%B5%AD%ED%9A%8C+%EB%B2%95%EC%95%88&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스' },
  { url: 'https://www.yonhapnews.co.kr/rss/politics.xml', source: '연합뉴스' },
  { url: 'https://rss.kbs.co.kr/rss/kbs_politics_0001.xml', source: 'KBS' },
  { url: 'https://www.hani.co.kr/rss/politics/', source: '한겨레' },
]

interface NewsRow {
  title: string
  link: string
  pub_date: string
  source: string
}

function parseRss(xml: string, source: string): NewsRow[] {
  const items: NewsRow[] = []
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const match of matches) {
    const block = match[1]
    const title = (
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title>(.*?)<\/title>/)?.[1] || ''
    ).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
    const link = (
      block.match(/<link>(.*?)<\/link>/)?.[1] ||
      block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || ''
    ).trim()
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString()
    if (title) {
      items.push({ title, link, pub_date: new Date(pubDate).toISOString(), source })
    }
    if (items.length >= 10) break
  }
  return items
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const allItems: NewsRow[] = []

  await Promise.allSettled(
    RSS_FEEDS.map(async ({ url, source }) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Kovo/1.0)' },
          signal: AbortSignal.timeout(6000),
        })
        if (!res.ok) return
        const text = await res.text()
        allItems.push(...parseRss(text, source))
      } catch {}
    })
  )

  if (allItems.length === 0) {
    return NextResponse.json({ success: false, message: '뉴스 없음' })
  }

  // 기존 뉴스 전체 삭제 후 새로 삽입 (중복 방지)
  await supabase.from('news').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const { error } = await supabase.from('news').insert(
    allItems.map(item => ({
      title: item.title,
      link: item.link || null,
      pub_date: item.pub_date,
      source: item.source,
    }))
  )

  return NextResponse.json({
    success: !error,
    inserted: allItems.length,
    error: error?.message,
  })
}
