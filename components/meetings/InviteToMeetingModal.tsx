'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteToMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  meetingId: string
}

export function InviteToMeetingModal({ isOpen, onClose, meetingId }: InviteToMeetingModalProps) {
  const [email, setEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  const handleInvite = async () => {
    try {
      const response = await fetch('/api/meetings/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, email })
      })
      
      if (response.ok) {
        setInviteSent(true)
        setTimeout(() => {
          setInviteSent(false)
          setEmail('')
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Error sending invite:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to Meeting</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>
          
          {inviteSent ? (
            <div className="text-green-600 text-center py-2">
              Invite sent successfully!
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={!email}>
                Send Invite
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InviteToMeetingModal