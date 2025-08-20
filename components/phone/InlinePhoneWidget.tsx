'use client'

import { useState, useEffect } from 'react'
import { 
  Phone, PhoneOff, Mic, MicOff, Minimize2, Expand, 
  X, Hash, MessageSquare, Clock, PhoneIncoming,
  PhoneOutgoing, Volume2, VolumeX, ChevronDown,
  ChevronUp, MoreVertical
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useTelnyxSimpleCall } from '@/hooks/use-telnyx-simple-call'
import { RingtonePlayer } from '@/utils/audio-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface InlinePhoneWidgetProps {
  className?: string
  initialPhoneNumber?: string
  variant?: 'compact' | 'full'
  position?: 'fixed' | 'relative'
  collapsible?: boolean
}

export default function InlinePhoneWidget({ 
  className, 
  initialPhoneNumber = '',
  variant = 'compact',
  position = 'relative',
  collapsible = true
}: InlinePhoneWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(variant === 'compact')
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber)
  const [showDialpad, setShowDialpad] = useState(false)
  
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

  // Auto-expand when call is active
  useEffect(() => {
    if (isCallActive && variant === 'compact') {
      setIsCollapsed(false)
    }
  }, [isCallActive, variant])

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
        return <PhoneIncoming className="h-4 w-4 animate-pulse" />
      case 'connected':
        return <Phone className="h-4 w-4" />
      default:
        return <Phone className="h-4 w-4" />
    }
  }

  // Collapsed view (minimal bar)
  if (isCollapsed && collapsible) {
    return (
      <div className={cn(
        "bg-background border rounded-lg p-2 shadow-sm",
        position === 'fixed' && "fixed bottom-4 right-4 z-40",
        className
      )}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            <span className="text-sm">Phone</span>
            {isCallActive && (
              <Badge variant="outline" className={cn("text-xs", getStatusColor())}>
                {callState.duration}
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
        </div>
      </div>
    )
  }

  // Full view
  return (
    <Card className={cn(
      "overflow-hidden",
      position === 'fixed' && "fixed bottom-4 right-4 z-40 w-80",
      className
    )}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium text-sm">Phone</span>
            {isCallActive && (
              <Badge variant="outline" className={cn("text-xs", getStatusColor())}>
                {callState.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {collapsible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Call History</DropdownMenuItem>
                <DropdownMenuItem>Voicemail</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0">
        {/* Phone number input */}
        <div className="relative mb-3">
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
            className="pr-20 text-sm"
            disabled={isCallActive}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isCallActive) {
                handleCall()
              }
            }}
          />
          <div className="absolute right-1 top-1 flex gap-1">
            {!isCallActive ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowDialpad(!showDialpad)}
                  className="h-7 w-7"
                >
                  <Hash className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="default"
                  onClick={handleCall}
                  disabled={!phoneNumber}
                  className="h-7 w-7"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                size="icon"
                variant="destructive"
                onClick={handleEndCall}
                className="h-7 w-7"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Call status */}
        {isCallActive && (
          <div className="mb-3 p-2 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {callState.status === 'connected' ? 'Connected to' : 'Calling'}
              </span>
              <span className="text-xs font-mono">{callState.duration}</span>
            </div>
            <div className="text-sm font-medium">{callState.phoneNumber}</div>
          </div>
        )}

        {/* Call controls */}
        {isCallActive && (
          <div className="flex gap-2 mb-3">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="sm"
              onClick={toggleMute}
              className="flex-1"
            >
              {isMuted ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDialpad(!showDialpad)}
              className="flex-1"
            >
              <Hash className="h-4 w-4 mr-1" />
              Keypad
            </Button>
          </div>
        )}

        {/* Dialpad */}
        {showDialpad && (
          <div className="grid grid-cols-3 gap-1">
            {dialpadButtons.map((digit) => (
              <Button
                key={digit}
                variant="outline"
                size="sm"
                onClick={() => handleDigit(digit)}
                className="h-10 text-lg font-medium"
              >
                {digit}
              </Button>
            ))}
          </div>
        )}

        {/* Quick actions */}
        {!isCallActive && !showDialpad && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Recent
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Voicemail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}