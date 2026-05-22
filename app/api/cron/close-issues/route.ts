/**
 * GET /api/cron/close-issues
 * closes_at이 현재 시각 이전인 active 논재를 closed로 업데이트
 * vercel.json 크론이 하루 한 번 호출 (혹시 누락된 것 정리)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('issues')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .lt('closes_at', new Date().toISOString())
    .select('id, title')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ closed: data?.length ?? 0, items: data?.map(d => d.title) })
}
