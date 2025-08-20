'use client'

import { useEffect } from 'react'

export default function MobileFixes() {
  useEffect(() => {
    // Prevent double-tap zoom on iOS
    let lastTouchEnd = 0
    
    const handleTouchEnd = (event: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        event.preventDefault()
      }
      lastTouchEnd = now
    }
    
    // Add touch event listeners
    document.addEventListener('touchend', handleTouchEnd, false)
    
    // Fix for iOS Safari where buttons might not respond
    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        // Force immediate visual feedback
        target.style.opacity = '0.7'
        setTimeout(() => {
          target.style.opacity = ''
        }, 100)
      }
    }
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    
    // Cleanup
    return () => {
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])
  
  return null
}