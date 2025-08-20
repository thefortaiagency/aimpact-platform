'use client'

import { useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Users, Clock, Voicemail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import InlinePhoneWidget from './InlinePhoneWidget'

interface PhoneDockProps {
  className?: string
}

export default function PhoneDock({ className }: PhoneDockProps) {
  const [activeView, setActiveView] = useState<'dialer' | 'recent' | 'contacts' | 'voicemail'>('dialer')

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Navigation Tabs */}
      <div className="flex border-b">
        <Button
          variant={activeView === 'dialer' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('dialer')}
          className="flex-1 rounded-none"
        >
          <Phone className="h-4 w-4 mr-2" />
          Dialer
        </Button>
        <Button
          variant={activeView === 'recent' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('recent')}
          className="flex-1 rounded-none"
        >
          <Clock className="h-4 w-4 mr-2" />
          Recent
        </Button>
        <Button
          variant={activeView === 'contacts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('contacts')}
          className="flex-1 rounded-none"
        >
          <Users className="h-4 w-4 mr-2" />
          Contacts
        </Button>
        <Button
          variant={activeView === 'voicemail' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('voicemail')}
          className="flex-1 rounded-none"
        >
          <Voicemail className="h-4 w-4 mr-2" />
          Voicemail
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {activeView === 'dialer' && (
          <InlinePhoneWidget 
            variant="full" 
            position="relative" 
            collapsible={false}
            className="w-full"
          />
        )}
        
        {activeView === 'recent' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium mb-4">Recent Calls</h3>
            {/* Placeholder for recent calls */}
            <div className="text-sm text-muted-foreground text-center py-8">
              No recent calls
            </div>
          </div>
        )}
        
        {activeView === 'contacts' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium mb-4">Contacts</h3>
            {/* Placeholder for contacts */}
            <div className="text-sm text-muted-foreground text-center py-8">
              No contacts available
            </div>
          </div>
        )}
        
        {activeView === 'voicemail' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium mb-4">Voicemail</h3>
            {/* Placeholder for voicemail */}
            <div className="text-sm text-muted-foreground text-center py-8">
              No voicemail messages
            </div>
          </div>
        )}
      </div>
    </div>
  )
}