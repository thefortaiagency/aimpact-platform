'use client'

import { useState } from 'react'
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, Calendar, Plus, Link, Settings, Clock } from 'lucide-react'
import { DraggableGrid } from '@/components/ui/draggable-grid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { VCoachOptimizedMeeting } from '@/components/vcoach-optimized-meeting'
import { motion } from 'framer-motion'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Meeting {
  id: string
  title: string
  participants: number
  startTime: Date
  duration: string
  status: 'scheduled' | 'active' | 'ended'
}

export default function VideoConference(): JSX.Element {
  const [isInMeeting, setIsInMeeting] = useState(false)
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [meetingLink, setMeetingLink] = useState('')
  const [newMeetingTitle, setNewMeetingTitle] = useState('')
  
  // Mock user data
  const userId = `user-${Date.now()}`
  const userName = 'John Doe'
  
  // Mock meetings data
  const [meetings] = useState<Meeting[]>([
    {
      id: 'meet-1',
      title: 'Team Standup',
      participants: 5,
      startTime: new Date(Date.now() + 30 * 60000), // 30 min from now
      duration: '30 min',
      status: 'scheduled'
    },
    {
      id: 'meet-2',
      title: 'Client Review',
      participants: 3,
      startTime: new Date(Date.now() + 120 * 60000), // 2 hours from now
      duration: '1 hour',
      status: 'scheduled'
    }
  ])

  const handleCreateMeeting = () => {
    const meetingId = `impact-${Date.now()}`
    setCurrentMeetingId(meetingId)
    setShowCreateDialog(false)
    setIsInMeeting(true)
  }

  const handleJoinMeeting = () => {
    if (meetingLink) {
      // Extract meeting ID from link or use as is
      const meetingId = meetingLink.split('/').pop() || meetingLink
      setCurrentMeetingId(meetingId)
      setShowJoinDialog(false)
      setIsInMeeting(true)
    }
  }

  const handleLeaveMeeting = () => {
    setIsInMeeting(false)
    setCurrentMeetingId(null)
  }

  if (isInMeeting && currentMeetingId) {
    return (
      <div className="h-[calc(100vh-12rem)] relative">
        <div className="absolute inset-0 bg-black rounded-lg overflow-hidden">
          <VCoachOptimizedMeeting 
            callId={currentMeetingId}
            userId={userId}
            userName={userName}
            onError={(error) => {
              console.error('Meeting error:', error)
              handleLeaveMeeting()
            }}
            onStatus={(status) => console.log('Meeting status:', status)}
          />
        </div>
        <div className="absolute top-4 right-4 z-50">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleLeaveMeeting}
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Leave Meeting
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <DraggableGrid
        storageKey="video-quick-actions"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        enabled={true}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-card/30 backdrop-blur-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowCreateDialog(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">Start Instant Meeting</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Create a new video meeting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-card/30 backdrop-blur-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowJoinDialog(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Link className="h-5 w-5 text-blue-500" />
                    </div>
                    <h3 className="font-semibold">Join Meeting</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Join with meeting link or ID</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-card/30 backdrop-blur-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-500" />
                    </div>
                    <h3 className="font-semibold">Schedule Meeting</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Plan a future meeting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </DraggableGrid>

      {/* Upcoming Meetings */}
      <Card className="bg-card/30 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Upcoming Meetings</CardTitle>
          <CardDescription>Your scheduled video conferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{meeting.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {(() => {
                          try {
                            const date = meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime)
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          } catch (e) {
                            return 'Invalid time'
                          }
                        })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {meeting.participants} participants
                      </span>
                      <span>{meeting.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={meeting.status === 'active' ? 'default' : 'secondary'}>
                    {meeting.status}
                  </Badge>
                  <Button size="sm" onClick={() => {
                    setCurrentMeetingId(meeting.id)
                    setIsInMeeting(true)
                  }}>
                    Join
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meeting Stats */}
      <DraggableGrid
        storageKey="video-stats"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        enabled={true}
      >
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
                <p className="text-2xl font-bold">24</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <Video className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meeting Hours</p>
                <p className="text-2xl font-bold">18.5</p>
                <p className="text-xs text-muted-foreground mt-1">This week</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="text-2xl font-bold">142</p>
                <p className="text-xs text-muted-foreground mt-1">Unique users</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground mt-1">Live meetings</p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </DraggableGrid>

      {/* Create Meeting Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Instant Meeting</DialogTitle>
            <DialogDescription>
              Create a new video conference room
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Meeting Title (Optional)</Label>
              <Input
                id="meeting-title"
                placeholder="Team Standup"
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <span>HD Video</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span>Crystal Clear Audio</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Up to 100 participants</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMeeting}>
              <Video className="h-4 w-4 mr-2" />
              Start Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Meeting Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Meeting</DialogTitle>
            <DialogDescription>
              Enter the meeting link or ID to join
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-link">Meeting Link or ID</Label>
              <Input
                id="meeting-link"
                placeholder="Enter meeting link or ID"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinMeeting} disabled={!meetingLink}>
              Join Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}