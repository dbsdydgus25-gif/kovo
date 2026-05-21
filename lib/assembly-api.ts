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

export interface AssemblyApiResponse {
  bills: AssemblyBill[]
  total: number
}

export async function fetchRecentBills(page = 1, size = 10): Promise<AssemblyApiResponse> {
  if (!API_KEY) {
    return getMockBills()
  }

  try {
    const params = new URLSearchParams({
      KEY: API_KEY,
      Type: 'json',
      pIndex: String(page),
      pSize: String(size),
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
    if (resultCode !== 'INFO-000') throw new Error('Assembly API returned error')

    const rows: AssemblyBill[] = root[1]?.row ?? []
    return { bills: rows, total }
  } catch (err) {
    console.error('Assembly API fetch failed, using mock data:', err)
    return getMockBills()
  }
}

export async function fetchBillDetail(billId: string): Promise<AssemblyBill | null> {
  if (!API_KEY) return null

  try {
    const params = new URLSearchParams({
      KEY: API_KEY,
      Type: 'json',
      BILL_ID: billId,
    })

    const res = await fetch(`${BASE_URL}/BILLINFODETAIL?${params}`)
    if (!res.ok) throw new Error('Assembly API error')

    const data = await res.json()
    const row = data?.BILLINFODETAIL?.[1]?.row?.[0]
    return row ?? null
  } catch {
    return null
  }
}

function getMockBills(): AssemblyApiResponse {
  return {
    bills: [
      {
        BILL_ID: 'PRC_Z2X1U0R8V3T2H4F6G9W7K1N0M5L8P2',
        BILL_NO: '2201234',
        BILL_NAME: '반도체산업 경쟁력 강화 특별법안',
        PROPOSER: '정부',
        PROC_RESULT: '위원회 심사중',
        PROPOSE_DT: '2025-09-15',
        LINK_URL: 'https://likms.assembly.go.kr/bill/billDetail.do',
        AGE: '22',
      },
      {
        BILL_ID: 'PRC_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5',
        BILL_NO: '2201456',
        BILL_NAME: '최저임금법 일부개정법률안',
        PROPOSER: '의원',
        PROC_RESULT: '본회의 심의중',
        PROPOSE_DT: '2025-10-02',
        LINK_URL: 'https://likms.assembly.go.kr/bill/billDetail.do',
        AGE: '22',
      },
    ],
    total: 2,
  }
}
