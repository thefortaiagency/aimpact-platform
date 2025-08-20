'use client'

import { useState } from 'react'
import { Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CallInterface from './CallInterface'

export default function CallWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Call Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsOpen(true)}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Call Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold">Phone</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4">
            <CallInterface />
          </div>
        </div>
      )}
    </>
  )
}