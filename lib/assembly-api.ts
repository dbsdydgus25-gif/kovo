const BASE_URL = 'https://open.assembly.go.kr/portal/openapi'
const API_KEY = process.env.ASSEMBLY_API_KEY || ''

export interface AssemblyBill {
  BILL_ID: string
  BILL_NO: string
  BILL_NAME: string
  PROPOSER: string
  PROC_RESULT: string
  PROPOSE_DT: string
  LINK_URL: string
  AGE: string
}

export interface AssemblyBillDetail extends AssemblyBill {
  SUMMARY: string | null
  RST_MONA_NM: string | null  // 소관위원회
  COMMITTEE: string | null
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
      AGE: '22',  // 22대 국회
    })

    const res = await fetch(`${BASE_URL}/nwbillbill?${params}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error('Assembly API error')

    const data = await res.json()
    const root = data?.nwbillbill
    if (!root) throw new Error('Invalid response')

    const head = root[0]?.head
    const total = head?.[0]?.list_total_count ?? 0
    const resultCode = head?.[1]?.RESULT?.CODE
    if (resultCode !== 'INFO-000') throw new Error(`Assembly API: ${resultCode}`)

    const rows: AssemblyBill[] = root[1]?.row ?? []
    return { bills: rows, total }
  } catch (err) {
    console.error('Assembly fetchRecentBills failed:', err)
    return { bills: [], total: 0 }
  }
}

export async function fetchBillDetail(billId: string): Promise<AssemblyBillDetail | null> {
  if (!API_KEY) return null

  try {
    const params = new URLSearchParams({
      KEY: API_KEY,
      Type: 'json',
      BILL_ID: billId,
    })

    const res = await fetch(`${BASE_URL}/BILLINFODETAIL?${params}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('Assembly detail API error')

    const data = await res.json()
    const row = data?.BILLINFODETAIL?.[1]?.row?.[0]
    return row ?? null
  } catch {
    return null
  }
}
