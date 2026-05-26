import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRecentBills, fetchMemberParty } from '@/lib/assembly-api'

export const maxDuration = 300

const CATEGORIES = ['경제', '안보', '복지', '교육', '의료', '정치']

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

/** 법안이 국회 본회의에서 공포(가결)됐는지 확인 */
function isPromulgated(procResult: string | null): boolean {
  if (!procResult) return false
  return ['원안가결', '수정가결', '대안반영가결'].some(r => procResult.includes(r))
}

/** 법안 진행 단계 계산 (CURR_COMMITTEE 기반) */
function computeBillStage(bill: { CURR_COMMITTEE: string | null; PROPOSE_DT: string }): { idx: number; date: string } {
  if (bill.CURR_COMMITTEE) {
    return { idx: 1, date: bill.PROPOSE_DT }
  }
  return { idx: 0, date: bill.PROPOSE_DT }
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
        category: CATEGORIES.includes(parsed.category) ? parsed.category : inferCategory(committee, billName),
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
    let updated = 0
    let enriched = 0
    let partiesFixed = 0
    let autoClosed = 0
    const newBillIds: string[] = []

    for (const bill of bills) {
      const { data: existing } = await supabase
        .from('issues')
        .select('id, status, party')
        .eq('bill_no', bill.BILL_NO)
        .single()

      if (existing) {
        // ── 기존 법안: api_data 최신화 + 심사단계 + 공포 여부 체크 + 정당 재매칭 ──
        const stage = computeBillStage(bill)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {
          api_data: {
            ...(bill as unknown as Record<string, unknown>),
            bill_stage_idx: stage.idx,
            bill_stage_date: stage.date,
          },
        }

        // 공포된 법안 자동 완료됨 처리 (수동 hidden 상태는 보존)
        if (isPromulgated(bill.PROC_RESULT) && existing.status !== 'hidden') {
          updateData.status = 'closed'
          autoClosed++
        }

        // 정당이 '기타'이거나 없으면 재매칭 시도
        if (!existing.party || existing.party === '기타') {
          const newParty = bill.PROPOSER_KIND === '정부'
            ? '정부'
            : await fetchMemberParty(bill.RST_PROPOSER)
          if (newParty && newParty !== '기타') {
            updateData.party = newParty
            partiesFixed++
          }
        }

        await supabase.from('issues').update(updateData).eq('id', existing.id)
        updated++
        continue
      }

      // ── 신규 법안: 의원 정보 API로 정당 조회 후 즉시 삽입 ──
      const actualParty = bill.PROPOSER_KIND === '정부'
        ? '정부'
        : await fetchMemberParty(bill.RST_PROPOSER)

      const newStage = computeBillStage(bill)
      const { data: newIssue, error } = await supabase.from('issues').insert({
        title: bill.BILL_NAME.slice(0, 60),
        summary: `${bill.PROPOSER} 발의`,
        pro_summary: '',
        con_summary: '',
        category: inferCategory(bill.CURR_COMMITTEE, bill.BILL_NAME),
        party: actualParty,
        proposer: bill.RST_PROPOSER,
        bill_no: bill.BILL_NO,
        source_url: bill.LINK_URL,
        status: isPromulgated(bill.PROC_RESULT) ? 'closed' : 'active',
        featured: false,
        api_data: {
          ...(bill as unknown as Record<string, unknown>),
          bill_stage_idx: newStage.idx,
          bill_stage_date: newStage.date,
        },
      }).select('id').single()

      if (!error && newIssue) {
        inserted++
        newBillIds.push(newIssue.id)
      }
    }

    // 2. 신규 법안만 Claude로 가공 (title/summary/pro_con/category)
    for (const id of newBillIds) {
      const { data: row } = await supabase
        .from('issues')
        .select('title, proposer, api_data')
        .eq('id', id)
        .single()

      if (!row) continue

      const apiData = row.api_data as Record<string, string> | null
      const billName = apiData?.BILL_NAME ?? row.title
      const proposer = row.proposer ?? ''
      const committee = apiData?.CURR_COMMITTEE ?? null

      const processed = await processWithClaude(billName, proposer, committee)
      if (processed) {
        const { error } = await supabase.from('issues').update({
          title: processed.title,
          summary: processed.summary,
          pro_summary: processed.pro_summary,
          con_summary: processed.con_summary,
          category: processed.category,
          // party는 이미 의원 정보 API로 설정됨 — 덮어쓰지 않음
        }).eq('id', id)
        if (!error) enriched++
      }

      await new Promise(r => setTimeout(r, 300))
    }

    return NextResponse.json({
      success: true,
      total_api: total,
      updated,
      inserted,
      enriched,
      parties_fixed: partiesFixed,
      auto_closed: autoClosed,
      message: `${inserted}개 추가, ${updated}개 업데이트, ${enriched}개 AI 가공, ${partiesFixed}개 정당 수정, ${autoClosed}개 자동 완료됨`,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
