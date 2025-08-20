'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface IncomingCallNotificationProps {
  isVisible: boolean
  callerName?: string
  callerNumber: string
  onAccept: () => void
  onDecline: () => void
}

export default function IncomingCallNotification({
  isVisible,
  callerName,
  callerNumber,
  onAccept,
  onDecline
}: IncomingCallNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm"
        >
          <Card className="shadow-2xl border-2 bg-background/95 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl">
                      {callerName ? callerName.charAt(0).toUpperCase() : <User />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                    </span>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Incoming call</p>
                  <p className="text-lg font-semibold">{callerName || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{callerNumber}</p>
                </div>
                
                <div className="flex gap-4 w-full">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="flex-1"
                    onClick={onDecline}
                  >
                    <PhoneOff className="h-5 w-5 mr-2" />
                    Decline
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={onAccept}
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    Accept
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}