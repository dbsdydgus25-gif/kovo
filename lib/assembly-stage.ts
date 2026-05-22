export const BILL_STAGES = ['접수', '위원회 심사', '체계자구 심사', '본회의 심의', '정부이송', '공포']

export function getBillStageFromApiData(
  apiData: Record<string, unknown> | null,
): { stageIdx: number; stageDate: string } {
  if (!apiData) return { stageIdx: 0, stageDate: '' }

  if (typeof apiData.bill_stage_idx === 'number') {
    return {
      stageIdx:  apiData.bill_stage_idx,
      stageDate: (apiData.bill_stage_date as string) ?? (apiData.PROPOSE_DT as string) ?? '',
    }
  }

  return {
    stageIdx:  0,
    stageDate: (apiData.PROPOSE_DT as string) ?? '',
  }
}
