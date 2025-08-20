'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Delete, Hash } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { useTelnyxSimpleCall } from '@/hooks/use-telnyx-simple-call'
import { Badge } from '@/components/ui/badge'

interface DialpadModalProps {
  isOpen: boolean
  onClose: () => void
  initialPhoneNumber?: string
}

export default function DialpadModalSimple({ isOpen, onClose, initialPhoneNumber = '' }: DialpadModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber)
  const {
    callState,
    isMuted,
    makeCall,
    hangupCall,
    toggleMute,
    isCallActive
  } = useTelnyxSimpleCall()

  // Update phone number if prop changes
  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber)
    }
  }, [initialPhoneNumber])

  const handleDigit = (digit: string) => {
    setPhoneNumber(prev => prev + digit)
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
    switch (callState.status) {
      case 'initiating':
        return { text: 'Connecting...', color: 'yellow', animated: true }
      case 'ringing':
        return { text: 'Ringing...', color: 'blue', animated: true }
      case 'connected':
        return { text: 'Connected', color: 'green', animated: false }
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
                  'bg-yellow-500/10 border-yellow-500/20'
                }`}
              >
                <p className="text-sm text-muted-foreground">Calling</p>
                <p className="font-medium text-lg">{callState.phoneNumber}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className={`h-2 w-2 rounded-full ${
                    callStatus.color === 'green' ? 'bg-green-500' :
                    callStatus.color === 'blue' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  } ${callStatus.animated ? 'animate-pulse' : ''}`} />
                  <span className={`text-sm ${
                    callStatus.color === 'green' ? 'text-green-500' :
                    callStatus.color === 'blue' ? 'text-blue-500' :
                    'text-yellow-500'
                  }`}>
                    {callStatus.text}
                  </span>
                  {callState.status === 'connected' && (
                    <Badge variant="outline" className="ml-2">{callState.duration}</Badge>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dialpad */}
          <AnimatePresence>
            {!isCallActive && (
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
                disabled={!phoneNumber}
              >
                <Phone className="h-5 w-5 mr-2" />
                Call
              </Button>
            ) : (
              <>
                {callState.status === 'connected' && (
                  <Button
                    size="lg"
                    variant={isMuted ? "secondary" : "outline"}
                    onClick={toggleMute}
                    className="w-20"
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
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

          {/* Info Message */}
          {isCallActive && (
            <p className="text-xs text-center text-muted-foreground">
              Call initiated. You will receive the call on your registered phone.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}