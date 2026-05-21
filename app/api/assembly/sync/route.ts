import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRecentBills, fetchBillDetail } from '@/lib/assembly-api'

const CATEGORIES = ['경제', '안보', '복지', '교육', '의료', '정치']
const PARTIES = ['더불어민주당', '국민의힘', '조국혁신당', '개혁신당', '정부', '기타']

const COMMITTEE_CATEGORY_MAP: Record<string, string> = {
  '기획재정': '경제', '산업통상': '경제', '농림': '경제', '국토교통': '경제',
  '국방': '안보', '외교통일': '안보', '정보': '안보',
  '보건복지': '복지', '환경노동': '복지', '여성가족': '복지',
  '교육': '교육',
  '과학기술': '경제', '방송통신': '경제',
  '법제사법': '정치', '행정안전': '정치', '정치': '정치',
}

function inferCategoryFromCommittee(committee: string | null): string {
  if (!committee) return '정치'
  for (const [key, cat] of Object.entries(COMMITTEE_CATEGORY_MAP)) {
    if (committee.includes(key)) return cat
  }
  return '정치'
}

async function processWithClaude(
  billName: string,
  proposer: string,
  summary: string | null,
  committee: string | null
): Promise<{
  title: string
  summary: string
  pro_summary: string
  con_summary: string
  category: string
  party: string
} | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })

  const prompt = `국회 법안을 분석해서 반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만.

법안명: ${billName}
발의자: ${proposer}
소관위원회: ${committee ?? '미상'}
제안이유/요약: ${summary ? summary.slice(0, 1500) : '정보 없음'}

{
  "title": "일반 시민이 바로 이해할 수 있는 핵심 제목 (15자 이내, 법률 용어 배제)",
  "summary": "이 법안이 무엇을 바꾸려는지 2문장으로 쉽게 설명 (고등학생도 이해 가능한 수준)",
  "pro_summary": "이 법안을 지지하는 사람들의 핵심 논거 1~2문장",
  "con_summary": "이 법안에 반대하는 사람들의 핵심 논거 1~2문장",
  "category": "${CATEGORIES.join('/')} 중 가장 적합한 것 하나",
  "party": "${PARTIES.join('/')} 중 하나 (발의자 정보 기반으로 추론)"
}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    return {
      title: parsed.title?.slice(0, 60) ?? billName.slice(0, 60),
      summary: parsed.summary ?? '',
      pro_summary: parsed.pro_summary ?? '',
      con_summary: parsed.con_summary ?? '',
      category: CATEGORIES.includes(parsed.category) ? parsed.category : inferCategoryFromCommittee(committee),
      party: PARTIES.includes(parsed.party) ? parsed.party : '기타',
    }
  } catch (err) {
    console.error('Claude processing failed:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { bills } = await fetchRecentBills(1, 30)

    if (bills.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, message: 'No bills fetched (check ASSEMBLY_API_KEY)' })
    }

    let inserted = 0
    let skipped = 0

    for (const bill of bills) {
      // 이미 있는 법안 스킵
      const { data: existing } = await supabase
        .from('issues')
        .select('id')
        .eq('bill_no', bill.BILL_NO)
        .single()

      if (existing) { skipped++; continue }

      // 법안 상세 가져오기 (SUMMARY 필드 포함)
      const detail = await fetchBillDetail(bill.BILL_ID)

      // Claude로 AI 가공
      const processed = await processWithClaude(
        bill.BILL_NAME,
        bill.PROPOSER,
        detail?.SUMMARY ?? null,
        detail?.RST_MONA_NM ?? null
      )

      const issueData = processed
        ? {
            title: processed.title,
            summary: processed.summary,
            pro_summary: processed.pro_summary,
            con_summary: processed.con_summary,
            category: processed.category,
            party: processed.party,
            proposer: bill.PROPOSER,
            bill_no: bill.BILL_NO,
            source_url: bill.LINK_URL,
            status: 'active',
            featured: false,
            api_data: bill as unknown as Record<string, unknown>,
          }
        : {
            // Claude 없을 때 fallback
            title: bill.BILL_NAME.slice(0, 60),
            summary: `${bill.PROPOSER} 발의 | ${bill.PROC_RESULT}`,
            pro_summary: '',
            con_summary: '',
            category: inferCategoryFromCommittee(detail?.RST_MONA_NM ?? null),
            party: bill.PROPOSER.includes('정부') ? '정부' : '기타',
            proposer: bill.PROPOSER,
            bill_no: bill.BILL_NO,
            source_url: bill.LINK_URL,
            status: 'active',
            featured: false,
            api_data: bill as unknown as Record<string, unknown>,
          }

      const { error } = await supabase.from('issues').insert(issueData)
      if (!error) inserted++
      else console.error('Insert error:', error)

      // Rate limit 방지 (Claude API)
      if (processed) await new Promise(r => setTimeout(r, 300))
    }

    return NextResponse.json({ success: true, inserted, skipped, total: bills.length })
  } catch (err) {
    console.error('Assembly sync error:', err)
    return NextResponse.json({ error: 'Sync failed', detail: String(err) }, { status: 500 })
  }
}
