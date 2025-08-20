'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useDragControls, AnimatePresence } from 'framer-motion'
import { 
  Phone, PhoneOff, Mic, MicOff, Minimize2, Maximize2, 
  X, Hash, MessageSquare, Clock, PhoneIncoming,
  PhoneOutgoing, Volume2, VolumeX
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useTelnyxSimpleCall } from '@/hooks/use-telnyx-simple-call'
import { RingtonePlayer } from '@/utils/audio-utils'

interface FloatingPhoneWidgetProps {
  isOpen: boolean
  onClose: () => void
  initialPhoneNumber?: string
}

export default function FloatingPhoneWidget({ isOpen, onClose, initialPhoneNumber = '' }: FloatingPhoneWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber)
  const [showDialpad, setShowDialpad] = useState(false)
  const dragControls = useDragControls()
  const constraintsRef = useRef<HTMLDivElement>(null)
  
  // Update phone number when prop changes
  useEffect(() => {
    if (initialPhoneNumber && !isCallActive) {
      setPhoneNumber(initialPhoneNumber)
    }
  }, [initialPhoneNumber, isCallActive])
  
  const {
    callState,
    isMuted,
    makeCall,
    hangupCall,
    toggleMute,
    isCallActive
  } = useTelnyxSimpleCall()

  // Play ringtone when call is ringing
  useEffect(() => {
    if (callState.status === 'ringing') {
      const ringtone = new RingtonePlayer()
      ringtone.play()
      
      return () => {
        ringtone.stop()
      }
    }
  }, [callState.status])

  const handleCall = async () => {
    if (phoneNumber && !isCallActive) {
      await makeCall(phoneNumber)
      setShowDialpad(false)
    }
  }

  const handleEndCall = async () => {
    await hangupCall()
    setPhoneNumber('')
    setShowDialpad(false)
  }

  const handleDigit = (digit: string) => {
    setPhoneNumber(prev => prev + digit)
  }

  const dialpadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '*', '0', '#'
  ]

  const getStatusColor = () => {
    switch (callState.status) {
      case 'initiating':
      case 'ringing':
        return 'bg-blue-500'
      case 'connected':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (callState.status) {
      case 'initiating':
        return <PhoneOutgoing className="h-4 w-4" />
      case 'ringing':
        return <Phone className="h-4 w-4 animate-pulse" />
      case 'connected':
        return <PhoneIncoming className="h-4 w-4" />
      default:
        return <Phone className="h-4 w-4" />
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Invisible constraints container */}
      <div 
        ref={constraintsRef} 
        className="fixed inset-0 pointer-events-none z-40"
        style={{ margin: '20px' }}
      />
      
      <motion.div
        drag
        dragControls={dragControls}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9, x: 0, y: 100 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "fixed z-50 right-6 top-24",
          isMinimized ? "w-64" : "w-80"
        )}
        style={{ touchAction: 'none' }}
      >
        <Card className="shadow-2xl border-2">
          <CardHeader 
            className="pb-2 cursor-move bg-gradient-to-r from-primary/10 to-primary/5"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-semibold text-sm">
                  {isCallActive ? 'Active Call' : 'Phone'}
                </span>
                {isCallActive && (
                  <Badge variant="outline" className="text-xs">
                    {callState.duration}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={onClose}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-4 pb-3 space-y-3">
                  {/* Active Call Display */}
                  {isCallActive && (
                    <div className="text-center space-y-2">
                      <div className={cn(
                        "mx-auto w-20 h-20 rounded-full flex items-center justify-center",
                        getStatusColor()
                      )}>
                        <Phone className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{callState.phoneNumber}</p>
                        <p className="text-sm text-muted-foreground capitalize">{callState.status}</p>
                      </div>
                    </div>
                  )}

                  {/* Dialpad Section */}
                  {!isCallActive && (
                    <>
                      <div className="relative">
                        <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Enter phone number"
                          className="text-center pr-10"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowDialpad(!showDialpad)}
                        >
                          <Hash className="h-4 w-4" />
                        </Button>
                      </div>

                      {showDialpad && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-3 gap-1"
                        >
                          {dialpadButtons.map((digit) => (
                            <Button
                              key={digit}
                              variant="outline"
                              className="h-10 text-sm font-medium"
                              onClick={() => handleDigit(digit)}
                            >
                              {digit}
                            </Button>
                          ))}
                        </motion.div>
                      )}
                    </>
                  )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-2">
                    {!isCallActive ? (
                      <>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleCall}
                          disabled={!phoneNumber}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPhoneNumber('')
                            console.log("Opening SMS interface")
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {callState.status === 'connected' && (
                          <Button
                            size="sm"
                            variant={isMuted ? "secondary" : "outline"}
                            onClick={toggleMute}
                          >
                            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={handleEndCall}
                        >
                          <PhoneOff className="h-4 w-4 mr-2" />
                          End
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Call Info */}
                  {isCallActive && (
                    <div className="text-xs text-center text-muted-foreground">
                      Call initiated • Audio on your phone
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimized View */}
          {isMinimized && isCallActive && (
            <CardContent className="py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor())} />
                  <span className="text-sm font-medium">{callState.phoneNumber}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </>
  )
}