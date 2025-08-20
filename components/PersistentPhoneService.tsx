'use client'

import { useEffect, useState } from 'react'
import { Phone, PhoneOff } from 'lucide-react'

export function PersistentPhoneService() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize phone service
    const initPhone = async () => {
      try {
        // Phone initialization logic would go here
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to initialize phone service:', error)
        setIsConnected(false)
      }
    }

    initPhone()

    return () => {
      // Cleanup phone connection
      setIsConnected(false)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 text-white p-2 rounded-full shadow-lg">
        {isConnected ? (
          <Phone className="h-5 w-5 text-green-400" />
        ) : (
          <PhoneOff className="h-5 w-5 text-red-400" />
        )}
      </div>
    </div>
  )
}

export default PersistentPhoneService