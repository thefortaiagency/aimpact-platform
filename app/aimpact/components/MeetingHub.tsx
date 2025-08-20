'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, dateFnsLocalizer, View, Event } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../styles/meeting-calendar.css'
import { 
  Calendar as CalendarIcon, Clock, Video, Phone, MapPin, Plus, 
  Users, Send, Link2, ExternalLink, Copy, Check, Settings,
  ChevronLeft, ChevronRight, Grid3x3, List, Loader2, 
  VideoIcon, PhoneIcon, MapPinIcon, Globe, Lock, Timer,
  RefreshCw, Upload, Download, Trash2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import MeetingScheduler from './MeetingScheduler'
import EmailSenderSelect from './EmailSenderSelect'
import { motion, AnimatePresence } from 'framer-motion'
import { InviteToMeetingModal } from '@/components/meetings/InviteToMeetingModal'

// Setup date-fns localizer for react-big-calendar
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface Meeting {
  id: string
  title: string
  description?: string
  date: string
  time: string
  duration: number
  type: 'video' | 'phone' | 'in-person'
  location?: string
  meetingUrl?: string
  publicUrl?: string
  attendees: string[]
  requiresPassword?: boolean
  password?: string
  waitingRoomEnabled?: boolean
  status: 'scheduled' | 'active' | 'ended' | 'cancelled'
  createdAt: Date
  organizerEmail: string
  organizerName?: string
}

interface GoogleCalendarEvent {
  id: string
  title: string
  description: string
  start: string
  end: string
  isAllDay: boolean
  location: string
  attendees: { email: string; name: string; status: string }[]
  organizer: { email: string; name: string }
  status: string
  source: 'google-calendar'
  calendarName: string
  calendarId: string
  calendarColor: string
  meetingUrl?: string
  hangoutLink?: string
}

interface CalendarEvent extends Event {
  id: string
  resource: Meeting | GoogleCalendarEvent
}

// Quick meeting component for instant meetings
function QuickMeeting({ onMeetingCreated }: { onMeetingCreated: (meeting: Meeting) => void }) {
  const { data: session } = useSession()
  const [isCreating, setIsCreating] = useState(false)
  const [meetingLink, setMeetingLink] = useState('')
  const [meetingId, setMeetingId] = useState('')
  const [meetingTitle, setMeetingTitle] = useState('')
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [settings, setSettings] = useState({
    requiresPassword: false,
    password: '',
    waitingRoomEnabled: true,
    maxParticipants: 100
  })

  const generateMeetingId = () => {
    const words = ['team', 'sync', 'chat', 'meet', 'call', 'talk', 'connect', 'discuss']
    const randomWord = words[Math.floor(Math.random() * words.length)]
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `${randomWord}-${randomNum}`
  }

  const createInstantMeeting = async () => {
    setIsCreating(true)
    try {
      const meetingId = generateMeetingId()
      const now = new Date()
      
      // Format meeting data for the API
      const meetingData = {
        title: `Quick Meeting - ${session?.user?.name || 'Host'}`,
        description: 'Instant meeting started from Meeting Hub',
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm'),
        duration: 60,
        type: 'video' as const,
        attendees: [],
        requiresPassword: settings.requiresPassword,
        password: settings.password || undefined,
        waitingRoomEnabled: settings.waitingRoomEnabled,
        maxParticipants: settings.maxParticipants,
        createStreamCall: true // Flag to create Stream.io call
      }

      // Create meeting in database AND Stream.io
      console.log('🚀 Creating meeting with data:', meetingData);
      
      const response = await fetch('/api/aimpact/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      })

      console.log('📡 Meeting creation response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const savedMeeting = await response.json()
        console.log('✅ Meeting created successfully:', savedMeeting);
        
        // Use the ID from the saved meeting
        const publicUrl = `${window.location.origin}/meet/${savedMeeting.id || meetingId}`
        console.log('🔗 Meeting URL generated:', publicUrl);
        
        setMeetingLink(publicUrl)
        setMeetingId(savedMeeting.id || meetingId)
        setMeetingTitle(savedMeeting.title || meetingData.title)
        onMeetingCreated({ ...savedMeeting, publicUrl })
      } else {
        const error = await response.text()
        console.error('❌ Failed to create meeting:', {
          status: response.status,
          statusText: response.statusText,
          error
        });
        alert(`Failed to create meeting: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error creating instant meeting:', error)
      alert('Error creating meeting. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openMeeting = () => {
    window.open(meetingLink, '_blank', 'noopener,noreferrer')
  }

  if (meetingLink) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Meeting Ready!</CardTitle>
            <CardDescription>Share this link with participants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={meetingLink} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={openMeeting} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Meeting
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowInviteModal(true)}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Invite Users
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setMeetingLink('')
                setMeetingId('')
                setMeetingTitle('')
                setSettings({
                  requiresPassword: false,
                  password: '',
                  waitingRoomEnabled: true,
                  maxParticipants: 100
                })
              }}
              className="w-full"
            >
              New Meeting
            </Button>

          {settings.requiresPassword && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Password: <strong>{settings.password}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <InviteToMeetingModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        meetingLink={meetingLink}
        meetingTitle={meetingTitle}
        meetingId={meetingId}
      />
    </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Instant Meeting</CardTitle>
        <CardDescription>Create a meeting room that anyone can join</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={createInstantMeeting} 
          disabled={isCreating}
          className="w-full"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Video className="h-5 w-5 mr-2" />
              Start Meeting Now
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="w-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          Meeting Settings
        </Button>

        {showSettings && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="waiting-room">Enable Waiting Room</Label>
              <Switch
                id="waiting-room"
                checked={settings.waitingRoomEnabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, waitingRoomEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="password">Require Password</Label>
              <Switch
                id="password"
                checked={settings.requiresPassword}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, requiresPassword: checked })
                }
              />
            </div>

            {settings.requiresPassword && (
              <Input
                placeholder="Enter meeting password"
                value={settings.password}
                onChange={(e) => setSettings({ ...settings, password: e.target.value })}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="max-participants">Max Participants</Label>
              <Select
                value={settings.maxParticipants.toString()}
                onValueChange={(value) => 
                  setSettings({ ...settings, maxParticipants: parseInt(value) })
                }
              >
                <SelectTrigger id="max-participants">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function MeetingHub() {
  const { data: session } = useSession()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  // CALLBACK HOOKS - Must be defined before any conditional returns
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.resource.source === 'google-calendar') {
      setSelectedGoogleEvent(event.resource as GoogleCalendarEvent)
      setSelectedMeeting(null)
    } else {
      setSelectedMeeting(event.resource as Meeting)
      setSelectedGoogleEvent(null)
    }
  }, [])

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate)
  }, [])

  const handleSelectSlot = useCallback((slotInfo: any) => {
    // When user clicks on an empty slot, immediately open the scheduler
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end
    })
    setShowScheduler(true) // Open the full scheduler dialog directly
    console.log('Opening scheduler for slot:', slotInfo)
  }, [])

  const handleSelectDate = useCallback((selectedDate: Date) => {
    // When user clicks on a day in month view, switch to day view
    setDate(selectedDate)
    setView('day')
  }, [])

  // Load meetings and Google Calendar events
  useEffect(() => {
    Promise.all([fetchMeetings(), fetchGoogleCalendarEvents()])
  }, [])

  // Keyboard navigation for calendar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs, textareas, or content-editable elements
      if (event.target) {
        const tagName = (event.target as HTMLElement).tagName.toLowerCase()
        if (tagName === 'input' || tagName === 'textarea' || (event.target as HTMLElement).contentEditable === 'true') {
          return
        }
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (event.shiftKey) {
            // Navigate to previous period (shift + arrow)
            const newDate = new Date(date)
            if (view === 'day') {
              newDate.setDate(newDate.getDate() - 1)
            } else if (view === 'week') {
              newDate.setDate(newDate.getDate() - 7)
            } else if (view === 'month') {
              newDate.setMonth(newDate.getMonth() - 1)
            }
            setDate(newDate)
            event.preventDefault()
          }
          break
        case 'ArrowRight':
          if (event.shiftKey) {
            // Navigate to next period (shift + arrow)
            const newDate = new Date(date)
            if (view === 'day') {
              newDate.setDate(newDate.getDate() + 1)
            } else if (view === 'week') {
              newDate.setDate(newDate.getDate() + 7)
            } else if (view === 'month') {
              newDate.setMonth(newDate.getMonth() + 1)
            }
            setDate(newDate)
            event.preventDefault()
          }
          break
        case 't':
        case 'T':
          // Go to today
          setDate(new Date())
          event.preventDefault()
          break
        case 'd':
        case 'D':
          // Switch to day view
          setView('day')
          event.preventDefault()
          break
        case 'w':
        case 'W':
          // Switch to week view
          setView('week')
          event.preventDefault()
          break
        case 'm':
        case 'M':
          // Switch to month view
          setView('month')
          event.preventDefault()
          break
        case 'n':
        case 'N':
          // New meeting
          setShowScheduler(true)
          event.preventDefault()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [date, view])

  const fetchMeetings = async () => {
    try {
      console.log('[MeetingHub] Fetching meetings...')
      const response = await fetch('/api/aimpact/meetings')
      console.log('[MeetingHub] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[MeetingHub] Meetings data received:', data)
        const meetingsData = data.meetings || []
        console.log('[MeetingHub] Setting meetings:', meetingsData)
        setMeetings(meetingsData)
        updateCalendarEvents(meetingsData, googleEvents)
      } else {
        const errorData = await response.json()
        console.error('[MeetingHub] Error response:', errorData)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    }
  }

  const fetchGoogleCalendarEvents = async () => {
    try {
      const response = await fetch('/api/aimpact/calendar/events')
      if (response.ok) {
        const data = await response.json()
        const eventsData = data.events || []
        setGoogleEvents(eventsData)
        updateCalendarEvents(meetings, eventsData)
        console.log(`Loaded ${eventsData.length} Google Calendar events`)
      } else {
        const error = await response.json()
        console.error('Failed to fetch Google Calendar events:', error)
        if (error.setupGuide) {
          setSyncStatus({
            type: 'error',
            message: 'Google Calendar access not configured. Domain-wide delegation needed.'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateCalendarEvents = (meetingsData: Meeting[], googleEventsData: GoogleCalendarEvent[]) => {
    const allEvents: CalendarEvent[] = []
    
    // Add meetings
    meetingsData.forEach((meeting: Meeting) => {
      const startTime = new Date(`${meeting.date}T${meeting.time}`)
      const endTime = new Date(startTime.getTime() + meeting.duration * 60000)
      
      allEvents.push({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        start: startTime,
        end: endTime,
        resource: meeting
      })
    })
    
    // Add Google Calendar events
    googleEventsData.forEach((event: GoogleCalendarEvent) => {
      allEvents.push({
        id: `google-${event.id}`,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        resource: event
      })
    })
    
    setCalendarEvents(allEvents)
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const resource = event.resource
    let backgroundColor = 'hsl(217, 91%, 60%)' // Default blue with good contrast
    let color = 'white'
    
    // Style Google Calendar events differently
    if (resource.source === 'google-calendar') {
      const googleEvent = resource as GoogleCalendarEvent
      backgroundColor = googleEvent.calendarColor || 'hsl(156, 73%, 40%)' // Default green for Google events
      color = 'white'
      
      // Special colors for different types of Google events
      if (googleEvent.isAllDay) {
        backgroundColor = 'hsl(271, 100%, 60%)' // Purple for all-day events
      } else if (googleEvent.meetingUrl || googleEvent.hangoutLink) {
        backgroundColor = 'hsl(200, 100%, 40%)' // Blue for meetings with video links
      }
    } else {
      // Style for local meetings
      const meeting = resource as Meeting
      if (meeting.type === 'phone') {
        backgroundColor = 'hsl(142, 71%, 45%)' // Green with good contrast
      } else if (meeting.type === 'in-person') {
        backgroundColor = 'hsl(38, 92%, 50%)' // Amber with good contrast
        color = 'black' // Better contrast for amber background
      }
      
      if (meeting.status === 'active') {
        backgroundColor = 'hsl(0, 84%, 60%)' // Red for active meetings
        color = 'white'
      } else if (meeting.status === 'ended' || meeting.status === 'cancelled') {
        backgroundColor = 'hsl(220, 9%, 46%)' // Gray for past/cancelled
        color = 'white'
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 1,
        color,
        border: 'none',
        display: 'block',
        fontWeight: '500',
        fontSize: '0.875rem',
        padding: '2px 4px'
      }
    }
  }

  const getMeetingPublicUrl = (meeting: Meeting) => {
    return `${window.location.origin}/meet/${meeting.id}`
  }

  const copyMeetingLink = (meeting: Meeting) => {
    const url = getMeetingPublicUrl(meeting)
    navigator.clipboard.writeText(url)
  }

  const startMeeting = (meeting: Meeting) => {
    const url = getMeetingPublicUrl(meeting)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Sync with Google Calendar
  const syncWithGoogleCalendar = async (direction: 'from-google' | 'to-google' | 'both') => {
    setIsSyncing(true)
    setSyncStatus({ type: null, message: '' })
    
    try {
      // If syncing both ways, do from-google first, then to-google
      if (direction === 'both') {
        // First, import from Google
        const fromResponse = await fetch('/api/aimpact/meetings/google-calendar?direction=from-google')
        if (!fromResponse.ok) {
          const error = await fromResponse.json()
          throw new Error(error.error || 'Failed to sync from Google Calendar')
        }
        const fromResult = await fromResponse.json()
        
        // Then, export to Google
        const toResponse = await fetch('/api/aimpact/meetings/google-calendar?direction=to-google')
        if (!toResponse.ok) {
          const error = await toResponse.json()
          throw new Error(error.error || 'Failed to sync to Google Calendar')
        }
        const toResult = await toResponse.json()
        
        setSyncStatus({
          type: 'success',
          message: `Synced ${fromResult.meetings?.length || 0} from Google, ${toResult.meetings?.length || 0} to Google`
        })
      } else {
        // Single direction sync
        const response = await fetch(`/api/aimpact/meetings/google-calendar?direction=${direction}`)
        
        if (!response.ok) {
          const error = await response.json()
          
          // Check if it's a domain delegation error
          if (error.setupGuide) {
            setSyncStatus({
              type: 'error',
              message: 'Google Calendar sync requires setup. Please contact your administrator to enable domain-wide delegation for the service account.'
            })
          } else {
            throw new Error(error.error || 'Failed to sync with Google Calendar')
          }
          return
        }
        
        const result = await response.json()
        setSyncStatus({
          type: 'success',
          message: result.message || 'Successfully synced with Google Calendar'
        })
      }
      
      // Refresh meetings list
      await fetchMeetings()
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setSyncStatus({ type: null, message: '' })
      }, 5000)
      
    } catch (error: any) {
      console.error('Error syncing with Google Calendar:', error)
      setSyncStatus({
        type: 'error',
        message: error.message || 'Failed to sync with Google Calendar'
      })
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setSyncStatus({ type: null, message: '' })
      }, 5000)
    } finally {
      setIsSyncing(false)
    }
  }

  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd')
  
  // Filter today's meetings from both local meetings and Google Calendar events
  const todaysMeetings = meetings
    .filter(m => m.date === today && m.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time))
    
  const todaysGoogleEvents = googleEvents
    .filter(e => {
      const eventDate = format(new Date(e.start), 'yyyy-MM-dd')
      return eventDate === today
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    
  // Combine and sort all today's appointments
  const todaysAppointments = [
    ...todaysMeetings.map(m => ({ ...m, source: 'local' as const })),
    ...todaysGoogleEvents.map(e => ({ ...e, source: 'google' as const }))
  ].sort((a, b) => {
    const timeA = a.source === 'local' ? new Date(`${today}T${a.time}`).getTime() : new Date(a.start).getTime()
    const timeB = b.source === 'local' ? new Date(`${today}T${b.time}`).getTime() : new Date(b.start).getTime()
    return timeA - timeB
  })

  // Early return AFTER all hooks are called
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Meeting Hub</h2>
          <p className="text-muted-foreground">Schedule and manage all your meetings</p>
        </div>
        <div className="flex gap-2">
          {/* Refresh Calendar Button */}
          <Button 
            variant="outline" 
            onClick={() => {
              Promise.all([fetchMeetings(), fetchGoogleCalendarEvents()])
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>

          {/* Start Meeting Now Button */}
          <Button 
            variant="outline"
            onClick={async () => {
              // Create a proper instant meeting first
              try {
                const now = new Date()
                const meetingData = {
                  title: `Quick Meeting - ${session?.user?.name || 'Host'}`,
                  description: 'Instant meeting started from Meeting Hub',
                  date: format(now, 'yyyy-MM-dd'),
                  time: format(now, 'HH:mm'),
                  duration: 60,
                  type: 'video' as const,
                  attendees: [],
                  createStreamCall: true
                }

                console.log('🚀 Creating instant meeting for immediate join...');
                
                const response = await fetch('/api/aimpact/meetings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(meetingData)
                })

                if (response.ok) {
                  const savedMeeting = await response.json()
                  console.log('✅ Instant meeting created, opening:', savedMeeting.id);
                  
                  // Open with the REAL database ID
                  const meetingUrl = `${window.location.origin}/meet/${savedMeeting.id}`
                  window.open(meetingUrl, '_blank', 'noopener,noreferrer')
                } else {
                  console.error('❌ Failed to create instant meeting:', response.status);
                  alert('Failed to create instant meeting. Please try again.')
                }
              } catch (error) {
                console.error('❌ Error creating instant meeting:', error);
                alert('Error creating meeting. Please try again.')
              }
            }}
          >
            <Video className="h-4 w-4 mr-2" />
            Start Meeting Now
          </Button>

          {/* Meeting Settings Button */}
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Meeting Settings
          </Button>
          
          <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <MeetingScheduler 
                onMeetingCreated={async (meeting) => {
                  console.log('🎯 Meeting created callback triggered:', meeting);
                  console.log('🔄 Refreshing meetings and calendar events...');
                  await Promise.all([fetchMeetings(), fetchGoogleCalendarEvents()]);
                  console.log('✅ Refresh complete');
                  setShowScheduler(false);
                }}
                selectedSlot={selectedSlot}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncStatus.type && (
        <Alert className={syncStatus.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          {syncStatus.type === 'error' ? (
            <AlertDescription className="text-red-600">
              {syncStatus.message}
            </AlertDescription>
          ) : (
            <AlertDescription className="text-green-600">
              <Check className="h-4 w-4 inline mr-2" />
              {syncStatus.message}
            </AlertDescription>
          )}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Today's Schedule */}
        <div className="lg:col-span-1 space-y-6">
          {/* Today's Meetings */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Meetings</CardTitle>
              <CardDescription>All appointments for {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {todaysAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No meetings scheduled for today
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaysAppointments.map((appointment) => (
                      <div
                        key={appointment.source === 'local' ? appointment.id : `google-${appointment.id}`}
                        className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => {
                          if (appointment.source === 'local') {
                            setSelectedMeeting(appointment as Meeting)
                            setSelectedGoogleEvent(null)
                          } else {
                            setSelectedGoogleEvent(appointment as GoogleCalendarEvent)
                            setSelectedMeeting(null)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{appointment.title}</p>
                              {appointment.source === 'google' && (
                                <Badge variant="secondary" className="text-xs">Google</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {appointment.source === 'local' 
                                ? appointment.time
                                : `${format(new Date(appointment.start), 'h:mm a')} - ${format(new Date(appointment.end), 'h:mm a')}`
                              }
                            </div>
                            <div className="flex items-center gap-2">
                              {appointment.source === 'local' ? (
                                <>
                                  {appointment.type === 'video' && (
                                    <Badge variant="secondary" className="text-xs">
                                      <VideoIcon className="h-3 w-3 mr-1" />
                                      Video
                                    </Badge>
                                  )}
                                  {appointment.type === 'phone' && (
                                    <Badge variant="secondary" className="text-xs">
                                      <PhoneIcon className="h-3 w-3 mr-1" />
                                      Phone
                                    </Badge>
                                  )}
                                  {appointment.attendees && appointment.attendees.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      {appointment.attendees.length}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <>
                                  {(appointment.meetingUrl || appointment.hangoutLink) && (
                                    <Badge variant="secondary" className="text-xs">
                                      <VideoIcon className="h-3 w-3 mr-1" />
                                      Video
                                    </Badge>
                                  )}
                                  {appointment.attendees && appointment.attendees.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      {appointment.attendees.length}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {((appointment.source === 'local') || 
                              (appointment.source === 'google' && (appointment.meetingUrl || appointment.hangoutLink))) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (appointment.source === 'local') {
                                    startMeeting(appointment as Meeting)
                                  } else {
                                    const url = appointment.meetingUrl || appointment.hangoutLink
                                    if (url) window.open(url, '_blank', 'noopener,noreferrer')
                                  }
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {appointment.source === 'local' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (confirm(`Are you sure you want to delete "${appointment.title}"?`)) {
                                    const response = await fetch(`/api/aimpact/meetings?id=${appointment.id}`, {
                                      method: 'DELETE'
                                    })
                                    if (response.ok) {
                                      console.log('[MeetingHub] Meeting deleted successfully')
                                      await fetchMeetings()
                                    } else {
                                      console.error('[MeetingHub] Failed to delete meeting')
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle>Calendar</CardTitle>
                {view === 'day' && (
                  <div className="text-lg font-medium text-muted-foreground">
                    {format(date, 'EEEE, MMMM do, yyyy')}
                  </div>
                )}
                {view === 'week' && (
                  <div className="text-lg font-medium text-muted-foreground">
                    Week of {format(date, 'MMMM do, yyyy')}
                  </div>
                )}
                {view === 'month' && (
                  <div className="text-lg font-medium text-muted-foreground">
                    {format(date, 'MMMM yyyy')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Navigation arrows */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(date)
                    if (view === 'day') {
                      newDate.setDate(newDate.getDate() - 1)
                    } else if (view === 'week') {
                      newDate.setDate(newDate.getDate() - 7)
                    } else if (view === 'month') {
                      newDate.setMonth(newDate.getMonth() - 1)
                    }
                    setDate(newDate)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(date)
                    if (view === 'day') {
                      newDate.setDate(newDate.getDate() + 1)
                    } else if (view === 'week') {
                      newDate.setDate(newDate.getDate() + 7)
                    } else if (view === 'month') {
                      newDate.setMonth(newDate.getMonth() + 1)
                    }
                    setDate(newDate)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDate(new Date())}
                  className="mr-2"
                >
                  Today
                </Button>
                <div className="h-6 w-px bg-border mx-2" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView('day')}
                  className={view === 'day' ? 'bg-accent' : ''}
                >
                  Day
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView('week')}
                  className={view === 'week' ? 'bg-accent' : ''}
                >
                  Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView('month')}
                  className={view === 'month' ? 'bg-accent' : ''}
                >
                  Month
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[700px] relative">
              {isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading calendar...</p>
                  </div>
                </div>
              )}
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={handleNavigate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                onDrillDown={handleSelectDate}
                eventPropGetter={eventStyleGetter}
                selectable={true}
                popup
                toolbar={false} // We have custom toolbar
                resizable={false} // Disable resize to avoid conflicts
                draggableAccessor={() => false} // Disable drag for now
                scrollToTime={new Date(1970, 1, 1, 8, 0, 0)} // Start at 8am
                min={new Date(1970, 1, 1, 6, 0, 0)} // Allow scrolling to 6am
                max={new Date(1970, 1, 1, 23, 0, 0)} // Until 11pm
                step={15} // 15-minute increments
                timeslots={4} // 4 slots per hour (15-minute increments)
                dayLayoutAlgorithm="no-overlap" // Better event layout
                showMultiDayTimes // Show times on multi-day events
                formats={{
                  eventTimeRangeFormat: (range, culture, localizer) => {
                    // Show time for events in day/week view
                    if (view !== 'month' && localizer) {
                      const start = localizer.format(range.start, 'h:mm a', culture)
                      const end = localizer.format(range.end, 'h:mm a', culture)
                      return `${start} - ${end}`
                    }
                    return null
                  },
                  timeGutterFormat: (date, culture, localizer) => 
                    localizer?.format(date, 'h:mm a', culture) || '',
                  dayHeaderFormat: (date, culture, localizer) =>
                    localizer?.format(date, 'eeee, MMMM do', culture) || '',
                  monthHeaderFormat: (date, culture, localizer) =>
                    localizer?.format(date, 'MMMM yyyy', culture) || '',
                  dayRangeHeaderFormat: ({ start, end }, culture, localizer) => {
                    if (localizer) {
                      const startStr = localizer.format(start, 'MMM dd', culture)
                      const endStr = localizer.format(end, 'MMM dd, yyyy', culture)
                      return `${startStr} - ${endStr}`
                    }
                    return ''
                  }
                }}
                messages={{
                  allDay: 'All Day',
                  previous: 'Previous',
                  next: 'Next',
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day',
                  agenda: 'Agenda',
                  date: 'Date',
                  time: 'Time',
                  event: 'Event',
                  noEventsInRange: 'No events in this range',
                  showMore: (total) => `+${total} more`
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Details Modal */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-2xl">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMeeting.title}</DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedMeeting.date), 'MMMM d, yyyy')} at {selectedMeeting.time}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedMeeting.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedMeeting.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedMeeting.duration} minutes
                    </p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {selectedMeeting.type}
                    </p>
                  </div>
                </div>

                {selectedMeeting.attendees.length > 0 && (
                  <div>
                    <Label>Attendees ({selectedMeeting.attendees.length})</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedMeeting.attendees.map((email) => (
                        <Badge key={email} variant="secondary">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Meeting Link</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={getMeetingPublicUrl(selectedMeeting)} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyMeetingLink(selectedMeeting)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedMeeting.requiresPassword && (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      This meeting requires a password: <strong>{selectedMeeting.password}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedMeeting(null)}>
                  Close
                </Button>
                <Button onClick={() => startMeeting(selectedMeeting)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Google Calendar Event Details Modal */}
      <Dialog open={!!selectedGoogleEvent} onOpenChange={() => setSelectedGoogleEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedGoogleEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedGoogleEvent.title}
                  <Badge variant="secondary" className="text-xs">
                    Google Calendar
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedGoogleEvent.isAllDay ? (
                    format(new Date(selectedGoogleEvent.start), 'MMMM d, yyyy') + ' (All day)'
                  ) : (
                    `${format(new Date(selectedGoogleEvent.start), 'MMMM d, yyyy')} ${format(new Date(selectedGoogleEvent.start), 'h:mm a')} - ${format(new Date(selectedGoogleEvent.end), 'h:mm a')}`
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedGoogleEvent.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {selectedGoogleEvent.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Calendar</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedGoogleEvent.calendarName}
                    </p>
                  </div>
                  <div>
                    <Label>Organizer</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedGoogleEvent.organizer.name || selectedGoogleEvent.organizer.email}
                    </p>
                  </div>
                </div>

                {selectedGoogleEvent.location && (
                  <div>
                    <Label>Location</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedGoogleEvent.location}
                    </p>
                  </div>
                )}

                {selectedGoogleEvent.attendees.length > 0 && (
                  <div>
                    <Label>Attendees ({selectedGoogleEvent.attendees.length})</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedGoogleEvent.attendees.map((attendee) => (
                        <Badge key={attendee.email} variant="secondary" className="text-xs">
                          {attendee.name || attendee.email}
                          {attendee.status === 'accepted' && ' ✓'}
                          {attendee.status === 'declined' && ' ✗'}
                          {attendee.status === 'tentative' && ' ?'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedGoogleEvent.meetingUrl || selectedGoogleEvent.hangoutLink) && (
                  <div>
                    <Label>Meeting Link</Label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        value={selectedGoogleEvent.meetingUrl || selectedGoogleEvent.hangoutLink || ''} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const url = selectedGoogleEvent.meetingUrl || selectedGoogleEvent.hangoutLink
                          if (url) navigator.clipboard.writeText(url)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedGoogleEvent(null)}>
                  Close
                </Button>
                {(selectedGoogleEvent.meetingUrl || selectedGoogleEvent.hangoutLink) && (
                  <Button onClick={() => {
                    const url = selectedGoogleEvent.meetingUrl || selectedGoogleEvent.hangoutLink
                    if (url) window.open(url, '_blank', 'noopener,noreferrer')
                  }}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Meeting
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Create Meeting Dialog */}
      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Create Meeting</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <>
                  {format(selectedSlot.start, 'MMMM d, yyyy')} from{' '}
                  {format(selectedSlot.start, 'h:mm a')} to{' '}
                  {format(selectedSlot.end, 'h:mm a')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowQuickCreate(false)
                  setShowScheduler(true)
                }}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Video Meeting
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuickCreate(false)
                  setShowScheduler(true)
                }}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                Phone Call
              </Button>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setShowQuickCreate(false)
                setShowScheduler(true)
              }}
              className="w-full"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Detailed Scheduling
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setShowQuickCreate(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}