import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRecentBills } from '@/lib/assembly-api'

export const maxDuration = 60

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
  // fallback: bill name keywords
  if (/의료|병원|보건|간호|약사/.test(billName)) return '의료'
  if (/교육|학교|학생|대학/.test(billName)) return '교육'
  if (/국방|군|병역|안보/.test(billName)) return '안보'
  if (/복지|연금|육아|출산|보육/.test(billName)) return '복지'
  if (/세금|경제|금융|투자|무역|기업|산업/.test(billName)) return '경제'
  return '정치'
}

async function processWithClaude(
  billName: string,
  proposer: string,
  rstProposer: string,
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

  const prompt = `22대 국회 계류 법안을 분석해서 반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만.

법안명: ${billName}
대표발의자: ${rstProposer} (${proposer})
소관위원회: ${committee ?? '미배정'}

분석 요청:
1. 이 법안이 실제로 무엇을 바꾸는지 파악 (법안명에서 핵심 내용 추론)
2. 대표발의자 이름으로 22대 국회의원 소속 정당 판단
3. 찬반 논거는 편향 없이 양쪽 시각을 공정하게

{
  "title": "고등학생도 이해하는 제목 (20자 이내, '~법 개정안' 같은 표현 금지)",
  "summary": "이 법안이 무엇을 바꾸려는지 2문장 (숫자/구체적 변화 포함, 가능하면)",
  "pro_summary": "찬성 측 핵심 주장 1~2문장",
  "con_summary": "반대 측 핵심 주장 1~2문장",
  "category": "${CATEGORIES.join('/')} 중 하나",
  "party": "${PARTIES.join('/')} 중 하나"
}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return {
      title: (parsed.title ?? billName).slice(0, 60),
      summary: parsed.summary ?? '',
      pro_summary: parsed.pro_summary ?? '',
      con_summary: parsed.con_summary ?? '',
      category: CATEGORIES.includes(parsed.category) ? parsed.category : inferCategory(committee, billName),
      party: PARTIES.includes(parsed.party) ? parsed.party : '기타',
    }
  } catch (err) {
    console.error('Claude processing failed:', err)
    return null
  }
}

export async function GET() {
  return runSync()
}

export async function POST(_request: NextRequest) {
  return runSync()
}

/** Supabase assembly_members에서 의원 정당 조회 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function lookupParty(supabase: any, proposerName: string): Promise<string | null> {
  if (!proposerName) return null
  const { data } = await supabase
    .from('assembly_members')
    .select('party')
    .or(`name.eq.${proposerName},name.ilike.%${proposerName}%`)
    .limit(1)
    .maybeSingle()
  return (data as { party?: string } | null)?.party ?? null
}

/** 법안 진행 단계 계산 (CURR_COMMITTEE 기반) */
function computeBillStage(bill: { CURR_COMMITTEE: string | null; PROPOSE_DT: string }): { idx: number; date: string } {
  // 소관위원회가 배정됐으면 최소 '위원회 심사' 단계
  if (bill.CURR_COMMITTEE) {
    return { idx: 1, date: bill.PROPOSE_DT }
  }
  return { idx: 0, date: bill.PROPOSE_DT }
}

async function runSync() {

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { bills, total } = await fetchRecentBills(1, 30)

    if (bills.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        message: 'No bills fetched — check ASSEMBLY_API_KEY',
      })
    }

    let inserted = 0
    let updated = 0
    let skipped = 0
    let claudeCalls = 0
    const MAX_CLAUDE_PER_RUN = 5

    for (const bill of bills) {
      const { data: existing } = await supabase
        .from('issues')
        .select('id')
        .eq('bill_no', bill.BILL_NO)
        .single()

      // 기존 논재: api_data 및 심사단계 업데이트 (제목/요약 등 편집된 내용은 유지)
      if (existing) {
        const stage = computeBillStage(bill)
        await supabase.from('issues').update({
          api_data: {
            ...(bill as unknown as Record<string, unknown>),
            bill_stage_idx: stage.idx,
            bill_stage_date: stage.date,
          },
        }).eq('id', existing.id)
        updated++
        continue
      }

      const shouldUseClaude = claudeCalls < MAX_CLAUDE_PER_RUN
      const processed = shouldUseClaude
        ? await processWithClaude(bill.BILL_NAME, bill.PROPOSER, bill.RST_PROPOSER, bill.CURR_COMMITTEE)
        : null
      if (shouldUseClaude) claudeCalls++

      // 정당: DB 우선 → Claude 결과 → 정부여부 → 기타
      const dbParty = await lookupParty(supabase, bill.RST_PROPOSER)
      const finalParty = dbParty
        ?? (processed?.party && processed.party !== '기타' ? processed.party : null)
        ?? (bill.PROPOSER_KIND === '정부' ? '정부' : '기타')

      const stage = computeBillStage(bill)
      const issueData = {
        title: processed?.title ?? bill.BILL_NAME.slice(0, 60),
        summary: processed?.summary ?? `${bill.PROPOSER} 발의`,
        pro_summary: processed?.pro_summary ?? '',
        con_summary: processed?.con_summary ?? '',
        category: processed?.category ?? inferCategory(bill.CURR_COMMITTEE, bill.BILL_NAME),
        party: finalParty,
        proposer: bill.RST_PROPOSER,
        bill_no: bill.BILL_NO,
        source_url: bill.LINK_URL,
        status: 'active',
        featured: false,
        closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        api_data: {
          ...(bill as unknown as Record<string, unknown>),
          bill_stage_idx: stage.idx,
          bill_stage_date: stage.date,
        },
      }

      const { error } = await supabase.from('issues').insert(issueData)
      if (!error) inserted++
      else console.error('Insert error for', bill.BILL_NO, error)

      if (processed) await new Promise(r => setTimeout(r, 200))
    }

    return NextResponse.json({ success: true, inserted, updated, skipped, total })
  } catch (err) {
    console.error('Assembly sync error:', err)
    return NextResponse.json({ error: 'Sync failed', detail: String(err) }, { status: 500 })
  }
}
