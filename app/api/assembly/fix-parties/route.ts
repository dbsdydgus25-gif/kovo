import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMemberParty, KNOWN_PARTIES } from '@/lib/assembly-api'

export const maxDuration = 300

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 실제 국회 법안 전체 (이미 잘못 설정된 당도 포함해서 재검증)
  const { data: bills, error } = await supabase
    .from('issues')
    .select('id, proposer, party, api_data')
    .not('bill_no', 'is', null)
    .not('proposer', 'is', null)
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bills || bills.length === 0) return NextResponse.json({ success: true, updated: 0 })

  let updated = 0
  let skipped = 0
  const log: string[] = []

  for (const bill of bills) {
    const apiData = bill.api_data as Record<string, string> | null
    const proposerKind = apiData?.PROPOSER_KIND ?? '의원'
    const rstProposer = (bill.proposer as string) ?? ''

    // 정부 제출
    if (proposerKind === '정부') {
      if (bill.party !== '정부') {
        await supabase.from('issues').update({ party: '정부' }).eq('id', bill.id)
        updated++
        log.push(`정부 → 정부`)
      } else {
        skipped++
      }
      continue
    }

    // Claude로 실제 당 조회
    const actualParty = await fetchMemberParty(rstProposer)

    if (!KNOWN_PARTIES.includes(actualParty)) {
      // Claude도 모르는 경우 — 기존 값 유지
      skipped++
      log.push(`${rstProposer} → 알 수 없음 (유지: ${bill.party})`)
      continue
    }

    if (actualParty === bill.party) {
      skipped++
      continue
    }

    // 잘못된 당 → 정확한 당으로 업데이트
    await supabase.from('issues').update({ party: actualParty }).eq('id', bill.id)
    updated++
    log.push(`${rstProposer}: ${bill.party} → ${actualParty}`)

    // Claude API 과부하 방지
    await new Promise(r => setTimeout(r, 150))
  }

  return NextResponse.json({
    success: true,
    total: bills.length,
    updated,
    skipped,
    changes: log,
    message: `${updated}개 당 정보 수정 완료`,
  })
}
