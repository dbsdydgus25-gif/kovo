import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMemberParty } from '@/lib/assembly-api'

export const maxDuration = 300

const KNOWN_PARTIES = ['더불어민주당', '국민의힘', '조국혁신당', '개혁신당', '정부']

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // party가 '기타'이거나 잘못 추측된 모든 법안 가져오기
  const { data: bills, error } = await supabase
    .from('issues')
    .select('id, proposer, party, api_data')
    .not('bill_no', 'is', null)  // 실제 국회 법안만
    .not('proposer', 'is', null)
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bills || bills.length === 0) return NextResponse.json({ success: true, updated: 0 })

  let updated = 0
  let skipped = 0

  for (const bill of bills) {
    const apiData = bill.api_data as Record<string, string> | null
    const proposerKind = apiData?.PROPOSER_KIND ?? '의원'
    const rstProposer = bill.proposer as string

    // 정부 제출은 바로 설정
    if (proposerKind === '정부' || rstProposer === '정부') {
      if (bill.party !== '정부') {
        await supabase.from('issues').update({ party: '정부' }).eq('id', bill.id)
        updated++
      } else {
        skipped++
      }
      continue
    }

    // 의원 이름으로 실제 당 조회
    const actualParty = await fetchMemberParty(rstProposer)

    if (actualParty === bill.party) {
      skipped++
      continue
    }

    if (KNOWN_PARTIES.includes(actualParty)) {
      await supabase.from('issues').update({ party: actualParty }).eq('id', bill.id)
      updated++
    } else {
      skipped++
    }

    // API 과부하 방지
    await new Promise(r => setTimeout(r, 200))
  }

  return NextResponse.json({
    success: true,
    total: bills.length,
    updated,
    skipped,
    message: `${updated}개 당 정보 수정 완료`,
  })
}
