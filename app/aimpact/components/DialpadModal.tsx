'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Delete, Hash, Plus, Volume2, VolumeX, Pause } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
// import { useTelnyxCall } from '@/hooks/use-telnyx-call'

// Mock implementation until the hook is available
const useTelnyxCall = () => ({
  isInitialized: false,
  isConnecting: false,
  callState: 'idle' as 'idle' | 'connecting' | 'ringing' | 'active' | 'held' | 'new',
  isMuted: false,
  isOnHold: false,
  callDuration: 0,
  initialize: async () => {},
  makeCall: async (number: string) => { console.log('Making call to:', number) },
  hangupCall: async () => {},
  toggleMute: () => {},
  toggleHold: () => {},
  sendDTMF: (digit: string) => { console.log('DTMF:', digit) }
})
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface DialpadModalProps {
  isOpen: boolean
  onClose: () => void
  initialPhoneNumber?: string
}

export default function DialpadModal({ isOpen, onClose, initialPhoneNumber = '' }: DialpadModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber)
  const {
    isInitialized,
    isConnecting,
    callState,
    isMuted,
    isOnHold,
    callDuration,
    initialize,
    makeCall,
    hangupCall,
    toggleMute,
    toggleHold,
    sendDTMF,
  } = useTelnyxCall()

  // Initialize on mount
  useEffect(() => {
    if (isOpen && !isInitialized && !isConnecting) {
      initialize()
    }
  }, [isOpen, isInitialized, isConnecting, initialize])

  // Update phone number if prop changes
  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber)
    }
  }, [initialPhoneNumber])

  const isCallActive = callState && ['connecting', 'ringing', 'active', 'held'].includes(callState)

  const handleDigit = (digit: string) => {
    setPhoneNumber(prev => prev + digit)
    
    // Send DTMF if call is active
    if (callState === 'active') {
      sendDTMF(digit)
    }
  }

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1))
  }

  const handleCall = async () => {
    if (phoneNumber && !isCallActive) {
      await makeCall(phoneNumber)
    }
  }

  const handleEndCall = async () => {
    await hangupCall()
    setPhoneNumber('')
    onClose()
  }

  const dialpadButtons = [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '', icon: Hash },
  ]

  const getCallStatusDisplay = () => {
    if (!callState) return null
    
    switch (callState) {
      case 'new':
      case 'connecting':
        return { text: 'Connecting...', color: 'yellow', animated: true }
      case 'ringing':
        return { text: 'Ringing...', color: 'blue', animated: true }
      case 'active':
        return { text: 'Connected', color: 'green', animated: false }
      case 'held':
        return { text: 'On Hold', color: 'orange', animated: true }
      default:
        return null
    }
  }

  const callStatus = getCallStatusDisplay()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && isCallActive) {
        // Don't close if call is active
        return
      }
      onClose()
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isCallActive ? 'Call in Progress' : 'Make a Call'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Number Display */}
          <div className="relative">
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              className="text-center text-xl h-14 pr-12"
              readOnly={isCallActive}
            />
            {phoneNumber && !isCallActive && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                onClick={handleDelete}
              >
                <Delete className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Connection Status */}
          {!isInitialized && !isConnecting && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Phone system not initialized</p>
              <Button 
                variant="link" 
                onClick={initialize} 
                className="text-sm"
              >
                Initialize Now
              </Button>
            </div>
          )}

          {isConnecting && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <Progress value={33} className="mb-2" />
              <p className="text-sm text-muted-foreground">Connecting to phone system...</p>
            </div>
          )}

          {/* Call Status */}
          <AnimatePresence>
            {isCallActive && callStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`text-center p-4 rounded-lg border ${
                  callStatus.color === 'green' ? 'bg-green-500/10 border-green-500/20' :
                  callStatus.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
                  callStatus.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20' :
                  'bg-orange-500/10 border-orange-500/20'
                }`}
              >
                <p className="text-sm text-muted-foreground">
                  Calling
                </p>
                <p className="font-medium text-lg">{phoneNumber}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className={`h-2 w-2 rounded-full ${
                    callStatus.color === 'green' ? 'bg-green-500' :
                    callStatus.color === 'blue' ? 'bg-blue-500' :
                    callStatus.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-orange-500'
                  } ${callStatus.animated ? 'animate-pulse' : ''}`} />
                  <span className={`text-sm ${
                    callStatus.color === 'green' ? 'text-green-500' :
                    callStatus.color === 'blue' ? 'text-blue-500' :
                    callStatus.color === 'yellow' ? 'text-yellow-500' :
                    'text-orange-500'
                  }`}>
                    {callStatus.text}
                  </span>
                  {callState === 'active' && (
                    <Badge variant="outline" className="ml-2">{callDuration}</Badge>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dialpad */}
          <AnimatePresence>
            {(!isCallActive || callState === 'active') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-3 gap-2"
              >
                {dialpadButtons.map((btn) => {
                  const Icon = btn.icon
                  return (
                    <Button
                      key={btn.digit}
                      variant="outline"
                      className="h-16 text-lg font-medium relative"
                      onClick={() => handleDigit(btn.digit)}
                      disabled={isConnecting || !isInitialized}
                    >
                      {Icon ? (
                        <Icon className="h-5 w-5" />
                      ) : (
                        <>
                          <span>{btn.digit}</span>
                          {btn.letters && (
                            <span className="absolute bottom-2 text-[10px] text-muted-foreground">
                              {btn.letters}
                            </span>
                          )}
                        </>
                      )}
                    </Button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex justify-center gap-2">
            {!isCallActive ? (
              <Button
                size="lg"
                className="w-32 bg-green-600 hover:bg-green-700"
                onClick={handleCall}
                disabled={!phoneNumber || !isInitialized || isConnecting}
              >
                <Phone className="h-5 w-5 mr-2" />
                Call
              </Button>
            ) : (
              <>
                {callState === 'active' && (
                  <>
                    <Button
                      size="lg"
                      variant={isMuted ? "secondary" : "outline"}
                      onClick={toggleMute}
                      className="w-20"
                    >
                      {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Button
                      size="lg"
                      variant={isOnHold ? "secondary" : "outline"}
                      onClick={toggleHold}
                      className="w-20"
                    >
                      {isOnHold ? <Volume2 className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    </Button>
                  </>
                )}
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-32"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  End
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}