import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const assemblyKey = process.env.ASSEMBLY_API_KEY

  const info: Record<string, unknown> = {
    anthropic_key: apiKey ? `✅ 설정됨` : '❌ 없음',
    supabase_url:  supabaseUrl ? `✅ 설정됨` : '❌ 없음',
    service_key:   serviceKey ? `✅ 설정됨` : '❌ 없음',
    assembly_key:  assemblyKey ? `✅ 설정됨` : '❌ 없음',
  }

  // DB 논재 현황
  if (supabaseUrl && serviceKey) {
    try {
      const sb = createClient(supabaseUrl, serviceKey)
      const [active, closed, total, members] = await Promise.all([
        sb.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
        sb.from('issues').select('*', { count: 'exact', head: true }),
        sb.from('assembly_members').select('*', { count: 'exact', head: true }),
      ])
      info.db_issues = {
        total:   total.count ?? 0,
        active:  active.count ?? 0,
        closed:  closed.count ?? 0,
        members: members.count ?? 0,
      }
    } catch (err) {
      info.db_error = String(err)
    }
  }

  // 국회 법안 API 테스트 (ALLNAMEMBER — 의원 1명만)
  if (assemblyKey) {
    try {
      const params = new URLSearchParams({
        KEY: assemblyKey, Type: 'json', pIndex: '1', pSize: '1',
      })
      const res = await fetch(
        `https://open.assembly.go.kr/portal/openapi/ALLNAMEMBER?${params}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const raw = await res.json()
      const code = raw?.ALLNAMEMBER?.[0]?.head?.[1]?.RESULT?.CODE
      const total = raw?.ALLNAMEMBER?.[0]?.head?.[0]?.list_total_count
      info.member_api = code === 'INFO-000' ? `✅ 정상 (의원 ${total}명)` : `❌ ${code}`
    } catch (err) {
      info.member_api = `❌ 타임아웃 or 오류: ${String(err)}`
    }
  }

  if (!apiKey) return NextResponse.json({ ...info, claude_test: '❌ API 키 없음' })

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'respond with just "ok"' }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '?'
    return NextResponse.json({ ...info, claude_test: `✅ 성공: "${text}"` })
  } catch (err) {
    return NextResponse.json({ ...info, claude_test: `❌ 실패: ${String(err)}` })
  }
}
