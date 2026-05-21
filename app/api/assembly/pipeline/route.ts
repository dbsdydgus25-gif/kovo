import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRecentBills } from '@/lib/assembly-api'

export const maxDuration = 300

const CATEGORIES = ['경제', '안보', '복지', '교육', '의료', '정치']
const PARTIES = ['더불어민주당', '국민의힘', '조국혁신당', '개혁신당', '정부', '기타']

const COMMITTEE_CATEGORY_MAP: Record<string, string> = {
  '기획재정': '경제', '산업통상': '경제', '농림': '경제', '국토교통': '경제',
  '과학기술': '경제', '방송통신': '경제', '금융': '경제',
  '국방': '안보', '외교통일': '안보', '정보': '안보',
  '보건복지': '복지', '환경노동': '복지', '여성가족': '복지',
  '교육': '교육',
  '보건': '의료', '의료': '의료',
  '법제사법': '정치', '행정안전': '정치', '정치': '정치', '선거': '정치',
}

function inferCategory(committee: string | null, billName: string): string {
  if (committee) {
    for (const [key, cat] of Object.entries(COMMITTEE_CATEGORY_MAP)) {
      if (committee.includes(key)) return cat
    }
  }
  if (/의료|병원|보건|간호|약사/.test(billName)) return '의료'
  if (/교육|학교|학생|대학/.test(billName)) return '교육'
  if (/국방|군|병역|안보/.test(billName)) return '안보'
  if (/복지|연금|육아|출산|보육/.test(billName)) return '복지'
  if (/세금|경제|금융|투자|무역|기업|산업/.test(billName)) return '경제'
  return '정치'
}

async function processWithClaude(billName: string, proposer: string, committee: string | null) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })
  const prompt = `22대 국회 계류 법안을 분석해서 반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만.

법안명: ${billName}
대표발의자: ${proposer}
소관위원회: ${committee ?? '미배정'}

{
  "title": "고등학생도 이해하는 제목 (20자 이내, '~법 개정안' 같은 표현 금지)",
  "summary": "이 법안이 무엇을 바꾸려는지 2문장 (숫자/구체적 변화 포함)",
  "pro_summary": "찬성 측 핵심 주장 1~2문장",
  "con_summary": "반대 측 핵심 주장 1~2문장",
  "category": "${CATEGORIES.join('/')} 중 하나",
  "party": "${PARTIES.join('/')} 중 하나"
}`

  // 최대 2번 시도
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title: (parsed.title ?? billName).slice(0, 60),
        summary: parsed.summary ?? '',
        pro_summary: parsed.pro_summary ?? '',
        con_summary: parsed.con_summary ?? '',
        category: CATEGORIES.includes(parsed.category) ? parsed.category : inferCategory(committee, billName),
        party: PARTIES.includes(parsed.party) ? parsed.party : '기타',
      }
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 500))
    }
  }
  return null
}

export async function GET() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. 최신 법안 30개 가져오기
    const { bills, total } = await fetchRecentBills(1, 30)
    if (bills.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, enriched: 0, total })
    }

    let inserted = 0
    let enriched = 0
    let skipped = 0
    const newBillIds: string[] = []

    // 2. 신규 법안만 DB에 삽입 (Claude 없이 빠르게)
    for (const bill of bills) {
      const { data: existing } = await supabase
        .from('issues')
        .select('id')
        .eq('bill_no', bill.BILL_NO)
        .single()

      if (existing) { skipped++; continue }

      const { data: newIssue, error } = await supabase.from('issues').insert({
        title: bill.BILL_NAME.slice(0, 60),
        summary: `${bill.PROPOSER} 발의`,
        pro_summary: '',
        con_summary: '',
        category: inferCategory(bill.CURR_COMMITTEE, bill.BILL_NAME),
        party: bill.PROPOSER_KIND === '정부' ? '정부' : '기타',
        proposer: bill.RST_PROPOSER,
        bill_no: bill.BILL_NO,
        source_url: bill.LINK_URL,
        status: 'active',
        featured: false,
        api_data: bill as unknown as Record<string, unknown>,
      }).select('id').single()

      if (!error && newIssue) {
        inserted++
        newBillIds.push(newIssue.id)
      }
    }

    // 3. 신규 법안 Claude로 가공
    for (const id of newBillIds) {
      const { data: bill } = await supabase
        .from('issues')
        .select('title, proposer, api_data')
        .eq('id', id)
        .single()

      if (!bill) continue

      const apiData = bill.api_data as Record<string, string> | null
      const billName = apiData?.BILL_NAME ?? bill.title
      const proposer = bill.proposer ?? ''
      const committee = apiData?.CURR_COMMITTEE ?? null

      const processed = await processWithClaude(billName, proposer, committee)
      if (processed) {
        const { error } = await supabase.from('issues').update({
          title: processed.title,
          summary: processed.summary,
          pro_summary: processed.pro_summary,
          con_summary: processed.con_summary,
          category: processed.category,
          party: processed.party,
        }).eq('id', id)
        if (!error) enriched++
      }

      await new Promise(r => setTimeout(r, 300))
    }

    return NextResponse.json({
      success: true,
      total_api: total,
      skipped,
      inserted,
      enriched,
      message: inserted === 0 ? '신규 법안 없음' : `${inserted}개 추가, ${enriched}개 AI 가공 완료`,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
