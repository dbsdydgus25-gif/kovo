'use client'

import { useState } from 'react'
import AuthModal from './AuthModal'

export default function LoginButton() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-[13px] font-semibold text-[#0038A8] bg-blue-50 px-3 py-1.5 rounded-full btn-press"
      >
        로그인
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}
