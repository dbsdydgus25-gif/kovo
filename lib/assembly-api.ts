const BASE_URL = 'https://open.assembly.go.kr/portal/openapi'
const API_KEY = process.env.ASSEMBLY_API_KEY || ''

export const KNOWN_PARTIES = ['더불어민주당', '국민의힘', '조국혁신당', '개혁신당']
const partyCache: Record<string, string> = {}

// 22대 국회의원 당 조회 — bulk 캐시에서 검색 (nprlapfmkoflxwwj 엔드포인트)
export async function fetchMemberParty(name: string): Promise<string> {
  if (!name || name === '정부') return name === '정부' ? '정부' : '기타'
  if (partyCache[name]) return partyCache[name]
  if (!API_KEY) return '기타'

  try {
    const { getAllMembers, findByName } = await import('./assembly-members-cache')
    const all    = await getAllMembers(API_KEY)
    const member = findByName(all, name)
    if (!member?.party) return '기타'

    partyCache[name] = member.party
    return member.party
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
  PROC_RESULT: string | null  // 처리결과 (원안가결/수정가결/부결/폐기/철회 등)
  PROC_DT: string | null      // 처리일
}

export interface AssemblyApiResponse {
  bills: AssemblyBill[]
  total: number
}

export interface AssemblyBillDetail {
  PROPOSE_REASON: string | null
  MAIN_CONTENT: string | null
}

/** 입법예고 페이지에서 제안이유 및 주요내용 스크래핑 (JSON API fallback) */
async function scrapeFromPal(billId: string): Promise<AssemblyBillDetail | null> {
  for (const urlType of ['lgsltpaOngoing', 'lgsltpaEnded']) {
    try {
      const url = `https://pal.assembly.go.kr/napal/lgsltpa/${urlType}/view.do?lgsltPaId=${billId}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      })
      if (!res.ok) continue
      const html = await res.text()

      // <!-- 제안이유 및 주요내용 --> 섹션 찾기
      const sectionMatch = html.match(/<!-- 제안이유 및 주요내용 -->([\s\S]*?)<!-- \/\/제안이유 및 주요내용 -->/)
      if (!sectionMatch) continue

      const descMatch = sectionMatch[1].match(/<div class="desc">([\s\S]*?)<\/div>/)
      if (!descMatch) continue

      const rawText = descMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()

      // "제안이유 및 주요내용\n\n" 접두사 제거
      const cleanText = rawText.replace(/^제안이유 및 주요내용[\s\n]*/u, '').trim()
      if (cleanText.length < 100) continue

      return { PROPOSE_REASON: cleanText, MAIN_CONTENT: null }
    } catch {
      // 다음 URL 시도
    }
  }
  return null
}

/** 의안 제안이유 및 주요내용 상세 조회 */
export async function fetchBillDetail(billId: string): Promise<AssemblyBillDetail | null> {
  if (!billId) return null

  // 1) Open Assembly JSON API 시도
  if (API_KEY) {
    try {
      const params = new URLSearchParams({ KEY: API_KEY, Type: 'json', BILL_ID: billId })
      const res = await fetch(`${BASE_URL}/BILLINFODETAIL?${params}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (res.ok) {
        const data = await res.json()
        const root = data?.BILLINFODETAIL
        if (root) {
          const resultCode = root[0]?.head?.[1]?.RESULT?.CODE
          if (resultCode === 'INFO-000') {
            const row = root[1]?.row?.[0]
            if (row) {
              const proposeReason = row.PROPOSE_REASON ?? row.BILL_REASON ?? row.REASON ?? null
              const mainContent = row.MAIN_CONTENT ?? row.BILL_CONTENT ?? row.CONTENT ?? null
              if (proposeReason || mainContent) {
                return { PROPOSE_REASON: proposeReason, MAIN_CONTENT: mainContent }
              }
            }
          }
        }
      }
    } catch {
      // fallthrough
    }
  }

  // 2) 입법예고 사이트(pal.assembly.go.kr) HTML 스크래핑
  return scrapeFromPal(billId)
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
      PROC_RESULT: r.PROC_RESULT ?? null,
      PROC_DT: r.PROC_DT ?? null,
    }))

    return { bills: rows, total }
  } catch (err) {
    console.error('Assembly fetchRecentBills failed:', err)
    return { bills: [], total: 0 }
  }
}
