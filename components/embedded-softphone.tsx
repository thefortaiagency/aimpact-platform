'use client'

import { useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EmbeddedSoftphone() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const handleCall = () => {
    setIsCallActive(!isCallActive)
  }

  const handleMute = () => {
    setIsMuted(!isMuted)
  }

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Phone</h3>
        <div className="flex gap-2">
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
            variant={isCallActive ? "destructive" : "secondary"}
            onClick={handleCall}
          >
            {isCallActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <div className="text-sm text-gray-400">
        {isCallActive ? 'Call in progress...' : 'Ready to call'}
      </div>
    </div>
  )
}