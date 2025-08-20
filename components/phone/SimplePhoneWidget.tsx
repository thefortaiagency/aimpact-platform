'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, X, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useWebRTCPhone } from '@/hooks/use-webrtc-phone'

export default function SimplePhoneWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  
  const {
    callState,
    isConnected,
    isMuted,
    duration,
    initialize,
    makeCall,
    endCall,
    toggleMute,
    formatDuration
  } = useWebRTCPhone({
    janusServer: process.env.NEXT_PUBLIC_JANUS_SERVER || 'https://webrtc.aimpactnexus.ai'
  })

  const isCallActive = callState === 'active' || callState === 'ringing' || callState === 'connecting'
  const isRinging = callState === 'ringing'
  const isOnCall = callState === 'active'

  // Initialize WebRTC on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  const handleCall = async () => {
    if (phoneNumber && !isCallActive) {
      await makeCall(phoneNumber)
    }
  }

  const handleEndCall = async () => {
    await endCall()
    setPhoneNumber('')
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
        >
          <Phone className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  // Minimized bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="shadow-lg">
          <div className="flex items-center gap-2 p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              <span className="text-sm">Phone</span>
              {isCallActive && (
                <Badge variant="outline" className="text-xs">
                  {formatDuration(duration) || '00:00'}
                </Badge>
              )}
            </Button>
            {isCallActive && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-8 w-8"
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleEndCall}
                  className="h-8 w-8"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false)
                setIsMinimized(false)
              }}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Full widget
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-80 shadow-lg">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="font-medium text-sm">WebRTC Phone</span>
              {isConnected && (
                <Badge variant="default" className="text-xs">
                  Connected
                </Badge>
              )}
              {isCallActive && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs ml-1",
                    isOnCall ? 'bg-green-500' : 'bg-blue-500'
                  )}
                >
                  {isOnCall ? 'On Call' : 'Ringing'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-0">
          {/* Phone number input */}
          <div className="flex gap-2 mb-3">
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              className="flex-1"
              disabled={isCallActive}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isCallActive) {
                  handleCall()
                }
              }}
            />
            {!isCallActive ? (
              <Button
                onClick={handleCall}
                disabled={!phoneNumber}
                size="icon"
              >
                <Phone className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleEndCall}
                variant="destructive"
                size="icon"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Call status */}
          {isCallActive && (
            <div className="p-3 bg-muted rounded-md mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {isOnCall ? 'Connected' : isRinging ? 'Incoming Call' : 'Calling'}
                </span>
                <span className="text-xs font-mono">{formatDuration(duration) || '00:00'}</span>
              </div>
              <div className="text-sm font-medium">
                {phoneNumber || 'Unknown'}
              </div>
              {/* Answer button removed - WebRTC hook doesn't support incoming calls yet */}
            </div>
          )}

          {/* Call controls */}
          {isCallActive && (
            <div className="flex gap-2">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="sm"
                onClick={toggleMute}
                className="flex-1"
              >
                {isMuted ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}