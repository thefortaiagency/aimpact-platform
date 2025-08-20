'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Menu, X, Home, Settings, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// PWA Install Prompt Interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Dynamically import the chatbot component to avoid SSR issues
const ResizableAgenticChatbot = dynamic(
  () => import('../components/ResizableAgenticChatbot').then(mod => mod.ResizableAgenticChatbot),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading NEXUS...</p>
        </div>
      </div>
    )
  }
)

export default function MobileChatPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // Check if mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    // Check if PWA/standalone mode
    const checkStandalone = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isInFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
      const isInMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      const standalone = isInStandaloneMode || isInFullscreen || isInMinimalUI || isIOSStandalone
      setIsStandalone(standalone)
      return standalone
    }
    
    // PWA Install Prompt Handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      setShowInstallBanner(true)
    }
    
    // Check if app was installed
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setShowInstallBanner(false)
      setDeferredPrompt(null)
    }
    
    checkMobile()
    checkStandalone()
    
    // Only show install banner on mobile, not in standalone mode
    if (window.innerWidth <= 768 && !checkStandalone()) {
      setShowInstallBanner(true)
    }
    
    window.addEventListener('resize', checkMobile)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-900">
      {/* Mobile Header - Only show if not in standalone mode */}
      {!isStandalone && (
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg z-50">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-lg font-semibold">NEXUS Chat</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>
      )}

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="absolute inset-0 bg-black/50 z-40" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Menu</h2>
            </div>
            
            <nav className="p-4 space-y-2">
              <Link href="/aimpact" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Home className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              
              <Link href="/aimpact/chat" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <MessageSquare className="h-5 w-5" />
                <span>Chat</span>
              </Link>
              
              <Link href="/aimpact/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>AImpact Nexus</p>
                <p>Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Container */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <ResizableAgenticChatbot 
            className="h-full"
            defaultSize={100}
            hideResize={true}
            mobileOptimized={true}
          />
        </div>
      </main>

      {/* PWA Install Prompt (if applicable) */}
      {showInstallBanner && isMobile && !isStandalone && (
        <div className="absolute bottom-20 left-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-5 duration-500 z-50">
          <div className="flex-1">
            <p className="font-semibold text-sm">📱 Install NEXUS Chat</p>
            <p className="text-xs opacity-90">Add to home screen for the best experience</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setShowInstallBanner(false)}
            >
              Later
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={async () => {
                if (deferredPrompt) {
                  // Use the deferred install prompt
                  try {
                    await deferredPrompt.prompt()
                    const { outcome } = await deferredPrompt.userChoice
                    console.log(`User response to install prompt: ${outcome}`)
                    
                    if (outcome === 'accepted') {
                      console.log('User accepted the install prompt')
                    }
                    
                    setDeferredPrompt(null)
                    setShowInstallBanner(false)
                  } catch (error) {
                    console.error('Error showing install prompt:', error)
                  }
                } else {
                  // Fallback for iOS or browsers without beforeinstallprompt
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                  const isInStandaloneMode = (window.navigator as any).standalone
                  
                  if (isIOS && !isInStandaloneMode) {
                    // Show iOS-specific instructions
                    alert('To install this app on your iOS device, tap the share button (square with arrow) and then "Add to Home Screen".')
                  } else {
                    // Generic instructions for other browsers
                    alert('To install this app, open your browser menu and look for "Add to Home Screen" or "Install App" option.')
                  }
                  
                  setShowInstallBanner(false)
                }
              }}
            >
              Install
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Viewport Meta Tags */}
      <style jsx global>{`
        @media (max-width: 768px) {
          /* Prevent zoom on input focus */
          input, textarea, select {
            font-size: 16px !important;
          }
          
          /* Full height on mobile */
          .chat-container {
            height: 100vh;
            height: calc(var(--vh, 1vh) * 100);
          }
          
          /* Hide scrollbars on mobile */
          ::-webkit-scrollbar {
            display: none;
          }
          
          /* Safe area insets for notched devices */
          .safe-top {
            padding-top: env(safe-area-inset-top);
          }
          
          .safe-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }

        /* PWA Styles */
        @media (display-mode: standalone) {
          /* Special styles for PWA mode */
          body {
            overscroll-behavior-y: contain;
          }
        }
        
        /* Landscape mode adjustments */
        @media (max-width: 768px) and (orientation: landscape) {
          header {
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
          }
        }
      `}</style>
    </div>
  )
}