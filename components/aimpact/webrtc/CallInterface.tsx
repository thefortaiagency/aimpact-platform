'use client'

import { useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CallInterface() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(false)

  const handleCall = () => {
    setIsCallActive(!isCallActive)
  }

  const handleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVideo = () => {
    setIsVideoOn(!isVideoOn)
  }

  return (
    <div className="flex items-center gap-2 p-4 bg-gray-900 rounded-lg">
      <Button
        size="icon"
        variant={isCallActive ? "destructive" : "secondary"}
        onClick={handleCall}
      >
        {isCallActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
      </Button>
      
      <Button
        size="icon"
        variant={isMuted ? "destructive" : "secondary"}
        onClick={handleMute}
        disabled={!isCallActive}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      
      <Button
        size="icon"
        variant={isVideoOn ? "secondary" : "outline"}
        onClick={handleVideo}
        disabled={!isCallActive}
      >
        {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>
    </div>
  )
}