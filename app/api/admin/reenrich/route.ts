/**
 * POST /api/admin/reenrich
 * 기존 논제의 summary/pro_con을 실제 제안이유 텍스트 기반으로 재가공
 * body: { id?: string }  — id 없으면 pro_summary가 빈 논제 전체 처리 (최대 20개)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { fetchBillDetail } from '@/lib/assembly-api'
import { isAdminAuthenticatedFromRequest } from '@/lib/admin-auth'

export const maxDuration = 300

const CATEGORIES = ['경제', '안보', '복지', '교육', '의료', '정치']

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function enrichIssue(
  billName: string,
  proposer: string,
  committee: string | null,
  proposeReason: string | null,
  mainContent: string | null,
) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })
  const rawText = [proposeReason, mainContent].filter(Boolean).join('\n\n').slice(0, 1500)
  const hasText = rawText.trim().length > 100

  // 원문 없으면 처리하지 않음 — 법안명만으로 가공하면 할루시네이션 위험
  if (!hasText) return null

  const contentBlock = `\n\n실제 제안이유 및 주요내용 (국회 원문):\n"""\n${rawText}\n"""\n`
  const instruction = `위 실제 원문을 바탕으로만 분석해. 원문에 없는 내용은 절대 추가하지 마. 찬성 논거는 제안이유에 나온 필요성/기대효과에서, 반대 논거는 원문 내용을 토대로 현실적으로 제기될 수 있는 비용·부작용·형평성 문제를 써.`

  const prompt = `22대 국회 법안을 시민들이 이해하기 쉽게 가공해. 반드시 JSON만 응답해.

법안명: ${billName}
대표발의자: ${proposer}
소관위원회: ${committee ?? '미배정'}${contentBlock}
${instruction}

{
  "title": "핵심 한 줄 (20자 이내, '~법 개정안' 같은 말 금지, 무엇을 바꾸는지 명확하게)",
  "summary": "이 법이 실제로 무엇을 어떻게 바꾸는지 구체적으로 2문장",
  "pro_summary": "찬성 측 주장 — 원문 근거 기반 1~2문장",
  "con_summary": "반대 측 우려 — 현실적 비용·부작용·형평성 1~2문장",
  "category": "${CATEGORIES.join('/')} 중 하나"
}`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
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
        category: CATEGORIES.includes(parsed.category) ? parsed.category : null,
      }
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 500))
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  // admin 쿠키 또는 CRON_SECRET Bearer 토큰으로 인증
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const bearerOk = cronSecret && authHeader === `Bearer ${cronSecret}`
  if (!isAdminAuthenticatedFromRequest(req) && !bearerOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {}
  try { body = await req.json() } catch { /* no body */ }
  const targetId: string | null = body.id ?? null
  const force: boolean = body.force === true  // force=true: 내용 있어도 강제 재처리
  const offset: number = body.offset ?? 0     // 페이지네이션용 오프셋

  // 대상 논제 조회
  let query = supabase
    .from('issues')
    .select('id, title, proposer, api_data')

  if (targetId) {
    query = query.eq('id', targetId)
  } else if (force) {
    // 강제 재처리: status가 active인 모든 논제 (오프셋 기반 페이지네이션)
    query = query.eq('status', 'active').range(offset, offset + 19)
  } else {
    // 빈 pro_summary 논제 우선, 최대 20개
    query = query.or('pro_summary.is.null,pro_summary.eq.').limit(20)
  }

  const { data: issues, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!issues?.length) return NextResponse.json({ ok: true, processed: 0, message: '처리할 논제 없음' })

  let processed = 0
  const results: { id: string; title: string; ok: boolean; reason?: string }[] = []

  for (const issue of issues) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiData = issue.api_data as Record<string, any> | null
    const billName = apiData?.BILL_NAME ?? issue.title
    const proposer = issue.proposer ?? ''
    const committee = apiData?.CURR_COMMITTEE ?? null
    const billId = apiData?.BILL_ID ?? ''

    const detail = await fetchBillDetail(billId)
    const textLen = [detail?.PROPOSE_REASON, detail?.MAIN_CONTENT].filter(Boolean).join('').trim().length
    const enriched = await enrichIssue(
      billName,
      proposer,
      committee,
      detail?.PROPOSE_REASON ?? null,
      detail?.MAIN_CONTENT ?? null,
    )

    if (enriched) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        title: enriched.title,
        summary: enriched.summary,
        pro_summary: enriched.pro_summary,
        con_summary: enriched.con_summary,
      }
      if (enriched.category) updateData.category = enriched.category

      await supabase.from('issues').update(updateData).eq('id', issue.id)
      processed++
      results.push({ id: issue.id, title: enriched.title, ok: true })
    } else {
      const reason = !billId ? 'no_bill_id' : !detail ? 'pal_null' : textLen <= 100 ? `text_short(${textLen})` : 'claude_fail'
      results.push({ id: issue.id, title: issue.title, ok: false, reason })
    }

    await new Promise(r => setTimeout(r, 400))
  }

  return NextResponse.json({ ok: true, processed, total: issues.length, results })
}
