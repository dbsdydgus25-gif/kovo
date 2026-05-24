'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { REGIONS, OCCUPATIONS } from '@/lib/utils'

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대', '60대이상']
const GENDERS = ['남성', '여성']

type Step = 'name' | 'gender' | 'age' | 'region' | 'occupation'
const STEPS: Step[] = ['name', 'gender', 'age', 'region', 'occupation']

const STEP_CONFIG: Record<Exclude<Step, 'name'>, { title: string; emoji: string; options: string[] }> = {
  gender:     { title: '성별을 알려주세요',   emoji: '👤', options: GENDERS },
  age:        { title: '연령대를 알려주세요',  emoji: '🎂', options: AGE_GROUPS },
  region:     { title: '거주 지역은?',         emoji: '📍', options: REGIONS },
  occupation: { title: '직업을 알려주세요',    emoji: '💼', options: OCCUPATIONS },
}

export default function OnboardingClient() {
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState('')
  const [answers, setAnswers] = useState<Record<Exclude<Step, 'name'>, string>>({
    gender: '', age: '', region: '', occupation: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const currentStep = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  async function saveAndFinish(finalAnswers: typeof answers, finalName: string) {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: finalName.trim() || null,
        age_group: finalAnswers.age,
        gender: finalAnswers.gender,
        region: finalAnswers.region,
        occupation: finalAnswers.occupation,
        onboarding_completed: true,
      })
    }
    router.push('/')
  }

  async function handleSelect(value: string) {
    const newAnswers = { ...answers, [currentStep]: value }
    setAnswers(newAnswers)

    if (stepIndex < STEPS.length - 1) {
      setTimeout(() => setStepIndex(i => i + 1), 180)
    } else {
      await saveAndFinish(newAnswers, name)
    }
  }

  function handleNameNext() {
    setStepIndex(i => i + 1)
  }

  function handleSkip() {
    router.push('/')
  }

  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-[#0038A8] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-12 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#0038A8] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/>
              </svg>
            </div>
            <span className="text-[15px] font-black text-[#1C1917]">Kovo</span>
          </div>
          <p className="text-[12px] text-gray-400">{stepIndex + 1} / {STEPS.length}</p>
        </div>

        {/* Name step */}
        {currentStep === 'name' && (
          <div className="flex-1 flex flex-col fade-in-up">
            <div className="mb-8">
              <div className="text-4xl mb-3">👋</div>
              <h2 className="text-[24px] font-black text-[#1C1917] leading-tight">
                어떻게 불러드릴까요?
              </h2>
              <p className="text-[13px] text-gray-400 mt-1.5">
                앱에서 표시될 닉네임이에요. 나중에 변경할 수 있어요.
              </p>
            </div>

            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                placeholder="닉네임 입력"
                maxLength={12}
                className="w-full h-14 px-4 rounded-2xl bg-white border-2 border-gray-100 text-[16px] font-semibold text-[#1C1917] placeholder:text-gray-300 focus:outline-none focus:border-[#0038A8] transition-colors"
                autoFocus
              />
              <p className="text-[11px] text-gray-400 mt-2 text-right">{name.length}/12</p>
            </div>

            <div className="mt-auto space-y-2.5">
              <button
                onClick={handleNameNext}
                className="w-full h-14 rounded-2xl bg-[#0038A8] text-white text-[16px] font-bold btn-press"
              >
                {name.trim() ? '다음' : '건너뛰기'}
              </button>
            </div>
          </div>
        )}

        {/* Choice steps (gender / age / region / occupation) */}
        {currentStep !== 'name' && (
          <div className="flex-1 flex flex-col fade-in-up" key={currentStep}>
            <div className="mb-8">
              <div className="text-4xl mb-3">{STEP_CONFIG[currentStep].emoji}</div>
              <h2 className="text-[24px] font-black text-[#1C1917] leading-tight">
                {STEP_CONFIG[currentStep].title}
              </h2>
              <p className="text-[13px] text-gray-400 mt-1.5">
                인구통계 인사이트에만 활용되며 익명으로 처리됩니다
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {STEP_CONFIG[currentStep].options.map(option => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  disabled={loading}
                  className="h-14 rounded-2xl text-[15px] font-semibold btn-press bg-white border-2 border-transparent text-[#1C1917] transition-all active:border-[#0038A8] active:text-[#0038A8] shadow-sm disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              onClick={handleSkip}
              className="mt-6 text-[13px] text-gray-400 text-center w-full py-2"
            >
              건너뛰기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
