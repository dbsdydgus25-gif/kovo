import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const assemblyKey = process.env.ASSEMBLY_API_KEY

  const info: Record<string, unknown> = {
    anthropic_key: apiKey ? `설정됨 (${apiKey.slice(0, 12)}...)` : '❌ 없음',
    supabase_url: supabaseUrl ? `설정됨 (${supabaseUrl.slice(0, 30)}...)` : '❌ 없음',
    service_key: serviceKey ? `설정됨 (${serviceKey.slice(0, 12)}...)` : '❌ 없음',
    assembly_key: assemblyKey ? `설정됨 (${assemblyKey.slice(0, 8)}...)` : '❌ 없음',
  }

  // 의원 정보 API 테스트 (김예지 = 국민의힘)
  if (assemblyKey) {
    try {
      const params = new URLSearchParams({
        KEY: assemblyKey,
        Type: 'json',
        pIndex: '1',
        pSize: '3',
        HG_NM: '김예지',
      })
      const res = await fetch(
        `https://open.assembly.go.kr/portal/openapi/nprlapfmkoflxwwj?${params}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const raw = await res.json()
      info.member_api_raw = raw
      info.member_api_row = raw?.nprlapfmkoflxwwj?.[1]?.row?.[0] ?? '없음'
    } catch (err) {
      info.member_api_error = String(err)
    }
  }

  if (!apiKey) return NextResponse.json({ ...info, claude_test: '❌ API 키 없음' })

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: '안녕 (respond with just "ok")' }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '?'
    return NextResponse.json({ ...info, claude_test: `✅ 성공: "${text}"` })
  } catch (err) {
    return NextResponse.json({ ...info, claude_test: `❌ 실패: ${String(err)}` })
  }
}
