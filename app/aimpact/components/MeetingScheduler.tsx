'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, Clock, Video, Phone, MapPin, Users, Send, Plus, X,
  Globe, Mail, MessageSquare, ChevronDown, Loader2, Check,
  Link2, FileText, AlertCircle, User, Building2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import EmailSenderSelect from './EmailSenderSelect'

interface Contact {
  id: string
  email: string
  firstName: string
  lastName: string
  organizationId?: string
  organizationName?: string
}

interface Meeting {
  id?: string
  title: string
  description: string
  date: string
  time: string
  duration: number // in minutes
  type: 'video' | 'phone' | 'in-person'
  location?: string
  meetingUrl?: string
  attendees: string[] // email addresses
  reminder: number // minutes before
  status: 'scheduled' | 'sent' | 'confirmed' | 'cancelled'
  createdAt?: Date
  notes?: string
  recurring?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    endDate?: string
    daysOfWeek?: number[] // 0=Sunday, 1=Monday, etc.
    occurrences?: number // Number of occurrences
  }
}

interface MeetingSchedulerProps {
  onMeetingCreated?: (meeting: Meeting) => void
  defaultAttendees?: string[]
  contactId?: string
  organizationId?: string
  selectedSlot?: {
    start: Date
    end: Date
  }
}

export default function MeetingScheduler({ 
  onMeetingCreated, 
  defaultAttendees = [],
  contactId,
  organizationId,
  selectedSlot 
}: MeetingSchedulerProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>(defaultAttendees)
  const [emailSent, setEmailSent] = useState(false)
  const [scheduledMeetings, setScheduledMeetings] = useState<Meeting[]>([])
  const [selectedFromEmail, setSelectedFromEmail] = useState('')
  
  // Initialize meeting with selected slot if provided
  const getInitialMeeting = (): Meeting => {
    if (selectedSlot) {
      const duration = Math.round((selectedSlot.end.getTime() - selectedSlot.start.getTime()) / (1000 * 60))
      return {
        title: '',
        description: '',
        date: format(selectedSlot.start, 'yyyy-MM-dd'),
        time: format(selectedSlot.start, 'HH:mm'),
        duration: duration || 60,
        type: 'video',
        location: '',
        meetingUrl: '',
        attendees: defaultAttendees,
        reminder: 15,
        status: 'scheduled'
      }
    }
    return {
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      duration: 60,
      type: 'video',
      location: '',
      meetingUrl: '',
      attendees: defaultAttendees,
      reminder: 15,
      status: 'scheduled',
      notes: ''
    }
  }
  
  const [meeting, setMeeting] = useState<Meeting>(getInitialMeeting())

  // Fetch contacts from CRM
  useEffect(() => {
    fetchContacts()
    fetchScheduledMeetings()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/aimpact/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchScheduledMeetings = async () => {
    try {
      const response = await fetch('/api/aimpact/meetings')
      if (response.ok) {
        const data = await response.json()
        setScheduledMeetings(data.meetings || [])
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    }
  }

  const handleScheduleMeeting = async () => {
    setIsLoading(true)
    setEmailSent(false)

    try {
      // If recurring, create multiple meetings
      const meetingsToCreate = []
      if (meeting.recurring?.enabled && meeting.recurring.occurrences) {
        const baseDate = new Date(meeting.date + 'T' + meeting.time)
        
        for (let i = 0; i < meeting.recurring.occurrences; i++) {
          const meetingDate = new Date(baseDate)
          
          // Calculate the next occurrence based on frequency
          switch (meeting.recurring.frequency) {
            case 'daily':
              meetingDate.setDate(meetingDate.getDate() + i)
              break
            case 'weekly':
              meetingDate.setDate(meetingDate.getDate() + (i * 7))
              break
            case 'biweekly':
              meetingDate.setDate(meetingDate.getDate() + (i * 14))
              break
            case 'monthly':
              meetingDate.setMonth(meetingDate.getMonth() + i)
              break
          }
          
          meetingsToCreate.push({
            ...meeting,
            date: format(meetingDate, 'yyyy-MM-dd'),
            time: format(meetingDate, 'HH:mm'),
            attendees: selectedContacts,
            recurringIndex: i,
            recurringTotal: meeting.recurring.occurrences
          })
        }
      } else {
        // Single meeting
        meetingsToCreate.push({
          ...meeting,
          attendees: selectedContacts
        })
      }

      // Create all meetings
      const savedMeetings = []
      for (const meetingData of meetingsToCreate) {
        const meetingResponse = await fetch('/api/aimpact/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meetingData)
        })

        if (!meetingResponse.ok) {
          throw new Error('Failed to create meeting')
        }

        const savedMeeting = await meetingResponse.json()
        savedMeetings.push(savedMeeting)
      }

      const savedMeeting = savedMeetings[0] // Use first meeting for email

      // Send email invitations
      const emailResponse = await fetch('/api/aimpact/meetings/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: savedMeeting.id,
          meeting: savedMeeting,
          fromEmail: selectedFromEmail,
          attendees: selectedContacts.map(email => {
            const contact = contacts.find(c => c.email === email)
            return {
              email,
              name: contact ? `${contact.firstName} ${contact.lastName}` : email
            }
          })
        })
      })

      if (emailResponse.ok) {
        setEmailSent(true)
        setTimeout(() => {
          setShowDialog(false)
          resetForm()
          onMeetingCreated?.(savedMeeting)
          fetchScheduledMeetings()
        }, 2000)
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setMeeting({
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      duration: 60,
      type: 'video',
      location: '',
      meetingUrl: '',
      attendees: [],
      reminder: 15,
      status: 'scheduled',
      notes: ''
    })
    setSelectedContacts([])
    setEmailSent(false)
  }

  const generateMeetingUrl = () => {
    // Generate a unique meeting URL for video calls
    const meetingId = Math.random().toString(36).substring(7)
    const baseUrl = window.location.origin
    setMeeting(prev => ({
      ...prev,
      meetingUrl: `${baseUrl}/meeting/${meetingId}`
    }))
  }

  const addCustomAttendee = (email: string) => {
    if (email && !selectedContacts.includes(email)) {
      setSelectedContacts([...selectedContacts, email])
    }
  }

  const removeAttendee = (email: string) => {
    setSelectedContacts(selectedContacts.filter(e => e !== email))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meeting Scheduler</CardTitle>
              <CardDescription>Schedule meetings and send invitations</CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule a Meeting</DialogTitle>
                  <DialogDescription>
                    Set up a meeting and send invitations to attendees
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="attendees">Attendees</TabsTrigger>
                    <TabsTrigger value="email">Email Template</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Meeting Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Project Review Meeting"
                        value={meeting.title}
                        onChange={(e) => setMeeting({...meeting, title: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Meeting agenda and details..."
                        value={meeting.description}
                        onChange={(e) => setMeeting({...meeting, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={meeting.date}
                          onChange={(e) => setMeeting({...meeting, date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={meeting.time}
                          onChange={(e) => setMeeting({...meeting, time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Select
                          value={meeting.duration.toString()}
                          onValueChange={(value) => setMeeting({...meeting, duration: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Recurring Meeting Options */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="recurring" className="font-medium">Recurring Meeting</Label>
                        <input
                          type="checkbox"
                          id="recurring"
                          checked={meeting.recurring?.enabled || false}
                          onChange={(e) => setMeeting({
                            ...meeting,
                            recurring: {
                              enabled: e.target.checked,
                              frequency: meeting.recurring?.frequency || 'weekly',
                              occurrences: meeting.recurring?.occurrences || 10
                            }
                          })}
                          className="h-4 w-4"
                        />
                      </div>
                      
                      {meeting.recurring?.enabled && (
                        <div className="space-y-3 mt-3">
                          <div className="space-y-2">
                            <Label htmlFor="frequency">Frequency</Label>
                            <Select
                              value={meeting.recurring.frequency}
                              onValueChange={(value: 'daily' | 'weekly' | 'biweekly' | 'monthly') => 
                                setMeeting({
                                  ...meeting,
                                  recurring: { ...meeting.recurring!, frequency: value }
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="occurrences">Number of Occurrences</Label>
                            <Input
                              id="occurrences"
                              type="number"
                              min="2"
                              max="52"
                              value={meeting.recurring.occurrences || 10}
                              onChange={(e) => setMeeting({
                                ...meeting,
                                recurring: { ...meeting.recurring!, occurrences: parseInt(e.target.value) }
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Meeting Type</Label>
                        <Select
                          value={meeting.type}
                          onValueChange={(value: 'video' | 'phone' | 'in-person') => 
                            setMeeting({...meeting, type: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                Video Call
                              </div>
                            </SelectItem>
                            <SelectItem value="phone">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Phone Call
                              </div>
                            </SelectItem>
                            <SelectItem value="in-person">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                In Person
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {meeting.type === 'video' && (
                      <div className="space-y-2">
                        <Label htmlFor="meetingUrl">Meeting URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="meetingUrl"
                            placeholder="https://meet.example.com/..."
                            value={meeting.meetingUrl}
                            onChange={(e) => setMeeting({...meeting, meetingUrl: e.target.value})}
                          />
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={generateMeetingUrl}
                          >
                            Generate
                          </Button>
                        </div>
                      </div>
                    )}

                    {meeting.type === 'in-person' && (
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="Office address or meeting room"
                          value={meeting.location}
                          onChange={(e) => setMeeting({...meeting, location: e.target.value})}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="reminder">Reminder</Label>
                      <Select
                        value={meeting.reminder.toString()}
                        onValueChange={(value) => setMeeting({...meeting, reminder: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No reminder</SelectItem>
                          <SelectItem value="15">15 minutes before</SelectItem>
                          <SelectItem value="30">30 minutes before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="1440">1 day before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="attendees" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select from Contacts</Label>
                      <ScrollArea className="h-[200px] border rounded-md p-3">
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between py-2 px-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => {
                              if (selectedContacts.includes(contact.email)) {
                                removeAttendee(contact.email)
                              } else {
                                addCustomAttendee(contact.email)
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {contact.firstName} {contact.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              </div>
                            </div>
                            {selectedContacts.includes(contact.email) && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        ))}
                      </ScrollArea>
                    </div>

                    <div className="space-y-2">
                      <Label>Add Custom Email</Label>
                      <div className="flex gap-2">
                        <Input
                          id="customEmail"
                          type="email"
                          placeholder="email@example.com"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const input = e.target as HTMLInputElement
                              addCustomAttendee(input.value)
                              input.value = ''
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const input = document.getElementById('customEmail') as HTMLInputElement
                            if (input?.value) {
                              addCustomAttendee(input.value)
                              input.value = ''
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Selected Attendees ({selectedContacts.length})</Label>
                      <div className="border rounded-md p-3 min-h-[100px]">
                        {selectedContacts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No attendees selected</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedContacts.map((email) => (
                              <Badge key={email} variant="secondary" className="gap-1">
                                <Mail className="h-3 w-3" />
                                {email}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => removeAttendee(email)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4">
                    <div className="space-y-2">
                      <EmailSenderSelect
                        value={selectedFromEmail}
                        onChange={setSelectedFromEmail}
                        label="Send invitations from"
                        required
                      />
                    </div>
                    
                    <div className="rounded-lg border p-4 bg-muted/30">
                      <h4 className="font-medium mb-2">Email Preview</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Subject:</strong> Meeting Invitation: {meeting.title || '[Meeting Title]'}</p>
                        <Separator />
                        <div className="space-y-2">
                          <p>Dear [Attendee Name],</p>
                          <p>You're invited to the following meeting:</p>
                          
                          <div className="ml-4 space-y-1">
                            <p><strong>Title:</strong> {meeting.title || '[Meeting Title]'}</p>
                            <p><strong>Date:</strong> {meeting.date ? format(new Date(meeting.date), 'MMMM d, yyyy') : '[Date]'}</p>
                            <p><strong>Time:</strong> {meeting.time || '[Time]'}</p>
                            <p><strong>Duration:</strong> {meeting.duration} minutes</p>
                            <p><strong>Type:</strong> {meeting.type === 'video' ? 'Video Call' : meeting.type === 'phone' ? 'Phone Call' : 'In Person'}</p>
                            {meeting.type === 'video' && meeting.meetingUrl && (
                              <p><strong>Meeting Link:</strong> {meeting.meetingUrl}</p>
                            )}
                            {meeting.type === 'in-person' && meeting.location && (
                              <p><strong>Location:</strong> {meeting.location}</p>
                            )}
                          </div>
                          
                          {meeting.description && (
                            <>
                              <p><strong>Description:</strong></p>
                              <p className="ml-4">{meeting.description}</p>
                            </>
                          )}
                          
                          <p className="mt-4">Please confirm your attendance by replying to this email.</p>
                          <p>Best regards,<br/>The Team</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional information for the email..."
                        value={meeting.notes}
                        onChange={(e) => setMeeting({...meeting, notes: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleScheduleMeeting}
                    disabled={!meeting.title || selectedContacts.length === 0 || !selectedFromEmail || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : emailSent ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Schedule & Send Invites
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Upcoming Meetings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Upcoming Meetings</h3>
            {scheduledMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No meetings scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledMeetings.slice(0, 5).map((meeting, index) => (
                  <motion.div
                    key={meeting.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {meeting.type === 'video' && <Video className="h-5 w-5 text-primary" />}
                        {meeting.type === 'phone' && <Phone className="h-5 w-5 text-primary" />}
                        {meeting.type === 'in-person' && <MapPin className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meeting.date), 'MMM d, yyyy')}
                          <Clock className="h-3 w-3 ml-1" />
                          {meeting.time}
                          <Users className="h-3 w-3 ml-1" />
                          {meeting.attendees.length} attendees
                        </div>
                      </div>
                    </div>
                    <Badge variant={meeting.status === 'confirmed' ? 'default' : 'secondary'}>
                      {meeting.status}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}