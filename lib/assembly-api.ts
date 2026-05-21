const BASE_URL = 'https://open.assembly.go.kr/portal/openapi'
const API_KEY = process.env.ASSEMBLY_API_KEY || ''

export const KNOWN_PARTIES = ['더불어민주당', '국민의힘', '조국혁신당', '개혁신당']
const partyCache: Record<string, string> = {}

// 22대 국회의원 당 조회 — Claude Haiku 사용 (Assembly 의원정보 API가 공개 미지원)
export async function fetchMemberParty(name: string): Promise<string> {
  if (!name || name === '정부') return name === '정부' ? '정부' : '기타'
  if (partyCache[name]) return partyCache[name]

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return '기타'

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: anthropicKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `22대 국회의원 "${name}"의 소속 정당은? JSON만: {"party":"더불어민주당/국민의힘/조국혁신당/개혁신당/기타 중 하나"}`,
      }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/"party"\s*:\s*"([^"]+)"/)
    const party = match?.[1] ?? '기타'
    const result = KNOWN_PARTIES.includes(party) ? party : '기타'
    partyCache[name] = result
    return result
  } catch {
    return '기타'
  }
}

export interface AssemblyBill {
  BILL_ID: string
  BILL_NO: string
  BILL_NAME: string
  PROPOSER: string
  RST_PROPOSER: string   // 대표발의자
  PROPOSER_KIND: string  // '의원' | '정부'
  PROPOSE_DT: string
  CURR_COMMITTEE: string | null  // 소관위원회
  LINK_URL: string
  AGE: string
}

export interface AssemblyApiResponse {
  bills: AssemblyBill[]
  total: number
}

export async function fetchRecentBills(page = 1, size = 30): Promise<AssemblyApiResponse> {
  if (!API_KEY) return { bills: [], total: 0 }

  try {
    const params = new URLSearchParams({
      KEY: API_KEY,
      Type: 'json',
      pIndex: String(page),
      pSize: String(size),
    })

    const res = await fetch(`${BASE_URL}/nwbqublzajtcqpdae?${params}`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const root = data?.nwbqublzajtcqpdae
    if (!root) throw new Error('Invalid response shape')

    const head = root[0]?.head
    const total = head?.[0]?.list_total_count ?? 0
    const resultCode = head?.[1]?.RESULT?.CODE
    if (resultCode !== 'INFO-000') throw new Error(`API error: ${resultCode}`)

    const rows: AssemblyBill[] = (root[1]?.row ?? []).map((r: Record<string, string | null>) => ({
      BILL_ID: r.BILL_ID ?? '',
      BILL_NO: r.BILL_NO ?? '',
      BILL_NAME: r.BILL_NAME ?? '',
      PROPOSER: r.PROPOSER ?? '',
      RST_PROPOSER: r.RST_PROPOSER ?? '',
      PROPOSER_KIND: r.PROPOSER_KIND ?? '의원',
      PROPOSE_DT: r.PROPOSE_DT ?? '',
      CURR_COMMITTEE: r.CURR_COMMITTEE ?? null,
      LINK_URL: r.LINK_URL ?? '',
      AGE: r.AGE ?? '22',
    }))

    return { bills: rows, total }
  } catch (err) {
    console.error('Assembly fetchRecentBills failed:', err)
    return { bills: [], total: 0 }
  }
}
