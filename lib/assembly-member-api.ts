const BASE_URL = 'https://open.assembly.go.kr/portal/openapi'

export interface AssemblyMember {
  name: string
  engName: string
  birthDate: string       // e.g. "19690101"
  age?: number
  party: string
  constituency: string    // 선거구 (출신 지역/비례)
  electionType: string    // 지역구 | 비례대표
  committee: string       // 대표 소속위원회
  committees: string      // 모든 소속위원회
  billCount: string       // 대표발의 법률안수
  sex: string
  bio: string             // 약력
  photoUrl: string
  sessions: string        // e.g. "21, 22대"
  monaCd: string
}

function calcAge(birthDate: string): number | undefined {
  if (!birthDate || birthDate.length < 4) return undefined
  const year = parseInt(birthDate.substring(0, 4))
  return isNaN(year) ? undefined : new Date().getFullYear() - year
}

export async function fetchMemberProfile(name: string): Promise<AssemblyMember | null> {
  const apiKey = process.env.ASSEMBLY_API_KEY
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      KEY: apiKey,
      Type: 'json',
      pIndex: '1',
      pSize: '5',
      HMG_NM: name,
      AGE: '22',
    })

    const res = await fetch(`${BASE_URL}/nwvrqwavdgbnynftam?${params}`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return null

    const data = await res.json()
    const root = data?.nwvrqwavdgbnynftam
    const resultCode = root?.[0]?.head?.[1]?.RESULT?.CODE
    const row = root?.[1]?.row?.[0]
    if (resultCode !== 'INFO-000' || !row) return null

    const monaCd: string = row.MONA_CD ?? ''
    const birthDate: string = row.BTH_DATE ?? ''

    // 이전 대수 조회 (병렬)
    const prevAges = ['20', '21']
    const prevResults = await Promise.all(prevAges.map(async (age) => {
      const p2 = new URLSearchParams({ KEY: apiKey, Type: 'json', pIndex: '1', pSize: '1', HMG_NM: name, AGE: age })
      const r2 = await fetch(`${BASE_URL}/nwvrqwavdgbnynftam?${p2}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!r2.ok) return null
      const d2 = await r2.json()
      const code = d2?.nwvrqwavdgbnynftam?.[0]?.head?.[1]?.RESULT?.CODE
      const cnt = d2?.nwvrqwavdgbnynftam?.[0]?.head?.[0]?.list_total_count ?? 0
      return (code === 'INFO-000' && cnt > 0) ? `${age}대` : null
    }))
    const foundPrev = prevResults.filter(Boolean)
    const sessions = [...foundPrev, '22대'].join(', ')

    return {
      name: row.HMG_NM ?? name,
      engName: row.ENG_NM ?? '',
      birthDate,
      age: calcAge(birthDate),
      party: row.POLY_NM ?? '',
      constituency: row.ORIG_NM ?? '',
      electionType: row.ELECT_GBN_NM ?? '',
      committee: row.CMIT_NM ?? '',
      committees: row.CMITS ?? '',
      billCount: row.BILLS ?? '0',
      sex: row.SEX ?? '',
      bio: row.MEM_TITLE ?? '',
      photoUrl: monaCd ? `https://open.assembly.go.kr/portal/img/naas/${monaCd}.jpg` : '',
      sessions,
      monaCd,
    }
  } catch (err) {
    console.error('Assembly member API error:', err)
    return null
  }
}

export const BILL_STAGES = ['접수', '위원회 심사', '체계자구 심사', '본회의 심의', '정부이송', '공포']

// Derive bill stage index from api_data fields
export function getBillStageFromApiData(
  apiData: Record<string, unknown> | null,
): { stageIdx: number; stageDate: string } {
  if (!apiData) return { stageIdx: 0, stageDate: '' }

  // If explicitly set
  if (typeof apiData.bill_stage_idx === 'number') {
    return {
      stageIdx: apiData.bill_stage_idx,
      stageDate: (apiData.bill_stage_date as string) ?? (apiData.PROPOSE_DT as string) ?? '',
    }
  }

  // Default to 접수 with proposal date
  return {
    stageIdx: 0,
    stageDate: (apiData.PROPOSE_DT as string) ?? '',
  }
}
