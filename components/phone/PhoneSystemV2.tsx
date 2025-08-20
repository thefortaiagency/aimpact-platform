'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import InlinePhoneWidget from './InlinePhoneWidget'

// Dynamically import FloatingPhoneWidget for backward compatibility
const FloatingPhoneWidget = dynamic(
  () => import('@/components/phone/FloatingPhoneWidget'),
  { 
    ssr: false,
    loading: () => <div className="hidden" />
  }
)

export interface PhoneSystemConfig {
  mode?: 'floating' | 'inline' | 'docked' | 'embedded'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  defaultCollapsed?: boolean
  showFloatingButton?: boolean
  allowMultipleCalls?: boolean
  enableWebRTC?: boolean
}

interface PhoneSystemV2Props {
  config?: PhoneSystemConfig
  className?: string
}

// Global phone state management
class PhoneManager {
  private static instance: PhoneManager
  private listeners: Set<(state: any) => void> = new Set()
  private state = {
    isOpen: false,
    mode: 'inline' as PhoneSystemConfig['mode'],
    activeNumber: '',
    isCallActive: false
  }

  static getInstance() {
    if (!PhoneManager.instance) {
      PhoneManager.instance = new PhoneManager()
    }
    return PhoneManager.instance
  }

  subscribe(listener: (state: any) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  openPhone(phoneNumber?: string, mode?: PhoneSystemConfig['mode']) {
    this.state = {
      ...this.state,
      isOpen: true,
      mode: mode || this.state.mode,
      activeNumber: phoneNumber || ''
    }
    this.notify()
  }

  closePhone() {
    this.state = { ...this.state, isOpen: false }
    this.notify()
  }

  togglePhone() {
    this.state = { ...this.state, isOpen: !this.state.isOpen }
    this.notify()
  }

  setCallActive(active: boolean) {
    this.state = { ...this.state, isCallActive: active }
    this.notify()
  }

  getState() {
    return this.state
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state))
  }
}

// Export global phone controls
export const phoneManager = PhoneManager.getInstance()

export default function PhoneSystemV2({ 
  config = {
    mode: 'inline',
    position: 'bottom-right',
    defaultCollapsed: true,
    showFloatingButton: true,
    allowMultipleCalls: false,
    enableWebRTC: false
  },
  className
}: PhoneSystemV2Props) {
  const [phoneState, setPhoneState] = useState(phoneManager.getState())
  
  useEffect(() => {
    return phoneManager.subscribe(setPhoneState)
  }, [])

  const { mode, position, showFloatingButton } = config
  const { isOpen, activeNumber, mode: activeMode } = phoneState

  const handleTogglePhone = useCallback(() => {
    phoneManager.togglePhone()
  }, [])

  const handleClosePhone = useCallback(() => {
    phoneManager.closePhone()
  }, [])

  // Position classes based on config
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-20 right-6',
    'top-left': 'top-20 left-6'
  }

  // Render floating button
  const renderFloatingButton = () => {
    if (!showFloatingButton || isOpen) return null

    return (
      <div className={`fixed ${positionClasses[position || 'bottom-right']} z-40`}>
        <Button
          onClick={handleTogglePhone}
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg"
        >
          <Phone className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  // Render phone widget based on mode
  const renderPhoneWidget = () => {
    if (!isOpen) return null

    const currentMode = activeMode || mode

    switch (currentMode) {
      case 'floating':
        return (
          <FloatingPhoneWidget 
            isOpen={isOpen} 
            onClose={handleClosePhone}
            initialPhoneNumber={activeNumber}
          />
        )
      
      case 'inline':
      case 'docked':
        return (
          <div className={`fixed ${positionClasses[position || 'bottom-right']} z-40`}>
            <InlinePhoneWidget
              initialPhoneNumber={activeNumber}
              variant={currentMode === 'docked' ? 'full' : 'compact'}
              position="relative"
              collapsible={true}
              className="shadow-lg"
            />
          </div>
        )
      
      case 'embedded':
        // Embedded mode should be handled by parent component
        return null
      
      default:
        return null
    }
  }

  return (
    <>
      {renderFloatingButton()}
      {renderPhoneWidget()}
    </>
  )
}

// Hook for components to interact with phone system
export function usePhoneSystem() {
  const [state, setState] = useState(phoneManager.getState())
  
  useEffect(() => {
    return phoneManager.subscribe(setState)
  }, [])

  return {
    ...state,
    openPhone: (phoneNumber?: string, mode?: PhoneSystemConfig['mode']) => 
      phoneManager.openPhone(phoneNumber, mode),
    closePhone: () => phoneManager.closePhone(),
    togglePhone: () => phoneManager.togglePhone(),
    setCallActive: (active: boolean) => phoneManager.setCallActive(active)
  }
}