'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import FloatingPhoneWidget to avoid SSR issues
const FloatingPhoneWidget = dynamic(
  () => import('@/components/phone/FloatingPhoneWidget'),
  { 
    ssr: false,
    loading: () => <div className="hidden" />
  }
)

export default function PhoneSystem() {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [initialPhoneNumber, setInitialPhoneNumber] = useState('')

  const openPhone = useCallback((phoneNumber?: string) => {
    if (phoneNumber) {
      setInitialPhoneNumber(phoneNumber)
    }
    setIsPhoneOpen(true)
  }, [])

  const closePhone = useCallback(() => {
    setIsPhoneOpen(false)
    setInitialPhoneNumber('')
  }, [])

  const togglePhone = useCallback(() => {
    setIsPhoneOpen(prev => !prev)
  }, [])

  return (
    <>
      {/* Floating Phone Button */}
      {!isPhoneOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={togglePhone}
            className="rounded-full h-14 w-14 shadow-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
        </div>
      )}
      
      {/* Phone Widget */}
      <FloatingPhoneWidget 
        isOpen={isPhoneOpen} 
        onClose={closePhone}
        initialPhoneNumber={initialPhoneNumber}
      />
    </>
  )
}