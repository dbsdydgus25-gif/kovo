/**
 * POST /api/tendency
 * 사용자의 투표 기록을 분석해 정치 성향 리포트 생성
 * 최소 10개 투표 필요
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // 투표 기록 + 논제 정보 조회
  const { data: rawVotes } = await supabase
    .from('votes')
    .select(`vote_type, issues(title, category, party, summary)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const votes = (rawVotes ?? []) as any[]

  if (votes.length < 10) {
    return NextResponse.json({ error: 'need_more_votes', count: votes.length }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI 설정 필요' }, { status: 503 })

  // 분석용 데이터 정리
  const summary = votes
    .filter(v => v.issues)
    .map(v => `[${v.issues!.category}] ${v.issues!.title} → ${v.vote_type === 'agree' ? '찬성' : '반대'} (발의: ${v.issues!.party || '미상'})`)
    .join('\n')

  const client = new Anthropic({ apiKey })
  const prompt = `아래는 한국 시민의 실제 국회 법안 찬반 투표 기록입니다.
이 데이터를 바탕으로 해당 시민의 정치·사회적 성향을 분석해 JSON으로만 응답해.

투표 기록:
${summary}

다음 JSON 형식으로 응답 (다른 텍스트 없이):
{
  "spectrum": "진보" | "중도진보" | "중도" | "중도보수" | "보수",
  "spectrum_score": -100~100 사이 숫자 (음수=진보, 양수=보수),
  "interest_areas": ["가장 많이 투표한 카테고리 상위 3개"],
  "tendency_tags": ["성향을 나타내는 키워드 3~5개", "예: 복지중시, 안보강조 등"],
  "summary": "이 사람의 성향을 2~3문장으로 설명. 구체적인 투표 패턴 근거 포함.",
  "agree_ratio": 전체 투표 중 찬성 비율(0~100 정수),
  "total_votes": 분석한 투표 수
}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('no json')
    const result = JSON.parse(jsonMatch[0])

    // 결과 저장 (user_profiles 테이블)
    await supabase
      .from('profiles')
      .update({ tendency_data: result, tendency_updated_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tendency_data, tendency_updated_at')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    tendency: profile?.tendency_data ?? null,
    updated_at: profile?.tendency_updated_at ?? null,
  })
}
