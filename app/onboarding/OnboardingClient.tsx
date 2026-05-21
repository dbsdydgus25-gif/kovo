'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { REGIONS, OCCUPATIONS } from '@/lib/utils'

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대', '60대이상']
const GENDERS = ['남성', '여성', '기타', '응답거부']

type Step = 'age' | 'gender' | 'region' | 'occupation'
const STEPS: Step[] = ['age', 'gender', 'region', 'occupation']

const STEP_CONFIG = {
  age: { title: '연령대를 알려주세요', emoji: '🎂', options: AGE_GROUPS },
  gender: { title: '성별을 알려주세요', emoji: '👤', options: GENDERS },
  region: { title: '거주 지역은?', emoji: '📍', options: REGIONS },
  occupation: { title: '직업을 알려주세요', emoji: '💼', options: OCCUPATIONS },
}

export default function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<Step, string>>({
    age: '',
    gender: '',
    region: '',
    occupation: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const currentStep = STEPS[stepIndex]
  const config = STEP_CONFIG[currentStep]

  async function handleSelect(value: string) {
    const newAnswers = { ...answers, [currentStep]: value }
    setAnswers(newAnswers)

    if (stepIndex < STEPS.length - 1) {
      setTimeout(() => setStepIndex(i => i + 1), 200)
    } else {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          age_group: newAnswers.age,
          gender: newAnswers.gender,
          region: newAnswers.region,
          occupation: newAnswers.occupation,
          onboarding_completed: true,
        })
      }
      router.push('/')
    }
  }

  function handleSkip() {
    router.push('/')
  }

  const progress = ((stepIndex + 1) / STEPS.length) * 100

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
              <span className="text-white text-sm font-black">민</span>
            </div>
            <span className="text-[15px] font-black text-[#1C1917]">민심</span>
          </div>
          <p className="text-[12px] text-gray-400">{stepIndex + 1} / {STEPS.length}</p>
        </div>

        {/* Question */}
        <div className="mb-8 fade-in-up" key={currentStep}>
          <div className="text-4xl mb-3">{config.emoji}</div>
          <h2 className="text-[24px] font-black text-[#1C1917] leading-tight">
            {config.title}
          </h2>
          <p className="text-[13px] text-gray-400 mt-1.5">
            인구통계 인사이트에만 활용되며 익명으로 처리됩니다
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {config.options.map(option => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={loading}
              className="h-14 rounded-2xl text-[15px] font-semibold btn-press bg-white border-2 border-transparent text-[#1C1917] transition-all active:border-[#0038A8] active:text-[#0038A8] shadow-sm"
            >
              {option}
            </button>
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="mt-6 text-[13px] text-gray-400 text-center w-full py-2"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
