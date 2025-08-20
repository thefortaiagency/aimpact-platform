'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, MessageSquare, Clock, 
  PhoneIncoming, PhoneOutgoing, PhoneMissed, User, Calendar,
  Search, Filter, Download, Play, Pause, MoreVertical,
  Headphones, Users, Activity, TrendingUp, AlertCircle,
  CheckCircle, XCircle, Timer, Mail, ChevronRight,
  Settings, Voicemail, PhoneForwarded, X, Send, Hash,
  ChevronDown, Star, MessageCircle, FileText, Paperclip,
  Video, VideoOff, Monitor, Maximize2, Minimize2
} from 'lucide-react'
import { DraggableGrid } from '@/components/ui/draggable-grid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { phoneSounds } from '@/lib/utils/phone-sounds'
import { usePhoneIntegration } from '@/hooks/use-phone-integration'
import { safeContactDisplay } from '@/lib/safeContactDisplay'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// WebRTC Interfaces
interface JanusConnection {
  sessionId: string
  handleId: string
  roomId: number
  ws?: WebSocket
  pc?: RTCPeerConnection
}

interface WebRTCCallState {
  isActive: boolean
  isConnecting: boolean
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing: boolean
  callDuration: number
  callId: string | null
  participants: string[]
  callType: 'audio' | 'video' | 'pstn'
  phoneNumber?: string
}

interface Contact {
  id: string
  name: string
  number: string
  email?: string
  avatar?: string
  company?: string
  isFavorite?: boolean
  lastContact?: Date
}

interface CommunicationRecord {
  id: string
  type: 'call' | 'sms' | 'voicemail' | 'email'
  direction: 'incoming' | 'outgoing' | 'missed' | 'internal'
  contact: {
    name?: string
    number: string
    avatar?: string
    company?: string
  }
  duration?: string
  message?: string
  timestamp: Date
  status: 'completed' | 'missed' | 'failed' | 'active' | 'on-hold' | 'delivered' | 'read' | 'sending'
  agent?: string
  department?: string
  recording?: boolean
  sentiment?: 'positive' | 'neutral' | 'negative'
  tags?: string[]
}

interface SMSConversation {
  contactId: string
  contact: Contact
  messages: CommunicationRecord[]
  lastMessage?: CommunicationRecord
  unreadCount: number
}

interface PhoneInterfaceProps {
  autoOpenDialpad?: boolean
  phoneNumber?: string
}

export default function PhoneInterfaceWebRTC({ autoOpenDialpad = false, phoneNumber }: PhoneInterfaceProps) {
  const [communications, setCommunications] = useState<CommunicationRecord[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const phoneIntegration = usePhoneIntegration()
  const [selectedRecord, setSelectedRecord] = useState<CommunicationRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeLines, setActiveLines] = useState<any[]>([])
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDialpad, setShowDialpad] = useState(autoOpenDialpad)
  const [dialpadNumber, setDialpadNumber] = useState(phoneNumber || '')
  const [inlineDialpadNumber, setInlineDialpadNumber] = useState('')
  const fetchCommunications = useRef<() => Promise<void>>()
  
  // WebRTC State
  const [webRTCCall, setWebRTCCall] = useState<WebRTCCallState>({
    isActive: false,
    isConnecting: false,
    isMuted: false,
    isVideoOn: true,
    isScreenSharing: false,
    callDuration: 0,
    callId: null,
    participants: [],
    callType: 'audio',
    phoneNumber: undefined
  })
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const connectionRef = useRef<JanusConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isVideoMaximized, setIsVideoMaximized] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'sms' | 'email' | 'voicemail'>('all')
  
  // SMS specific states
  const [showSMSCompose, setShowSMSCompose] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<SMSConversation | null>(null)
  const [smsMessage, setSmsMessage] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [smsRecipient, setSmsRecipient] = useState('')
  const [showActiveCallsDialog, setShowActiveCallsDialog] = useState(false)
  
  const [stats, setStats] = useState({
    totalCalls: 0,
    missedCalls: 0,
    totalSMS: 0,
    unreadSMS: 0,
    totalEmails: 0,
    unreadEmails: 0,
    avgDuration: '0:00',
    activeAgents: 0,
    inQueue: 0,
    sla: 100,
    activeCalls: 0
  })
  
  // Track active calls from phone integration
  useEffect(() => {
    const updateActiveCallsCount = () => {
      setStats(prev => ({ ...prev, activeCalls: phoneIntegration.activeCalls.length }));
    };
    
    // Initial update
    updateActiveCallsCount();
    
    // Subscribe to changes (check every second)
    const interval = setInterval(updateActiveCallsCount, 1000);
    
    return () => clearInterval(interval);
  }, [phoneIntegration.activeCalls.length]);

  // Mock contacts data
  useEffect(() => {
    const mockContacts: Contact[] = [
      { id: '1', name: 'John Smith', number: '+1234567890', email: 'john@example.com', company: 'ABC Corp', isFavorite: true },
      { id: '2', name: 'Sarah Johnson', number: '+0987654321', email: 'sarah@example.com', company: 'XYZ Ltd', isFavorite: true },
      { id: '3', name: 'Mike Davis', number: '+1122334455', email: 'mike@example.com', company: 'Tech Solutions' },
      { id: '4', name: 'Emma Wilson', number: '+5544332211', email: 'emma@example.com', company: 'Design Studio' },
      { id: '5', name: 'Robert Brown', number: '+9988776655', email: 'robert@example.com', company: 'Marketing Inc' },
    ]
    setContacts(mockContacts)
  }, [])

  useEffect(() => {
    fetchCommunications.current = async () => {
      try {
        setLoading(true)
        // Try Telnyx API first, fallback to existing API
        const response = await fetch('/api/aimpact/telnyx-communications')
        if (response.ok) {
          const data = await response.json()
          // Convert timestamp strings to Date objects
          const communicationsWithDates = (data.communications || []).map((comm: any) => ({
            ...comm,
            timestamp: new Date(comm.timestamp)
          }))
          setCommunications(communicationsWithDates)
          setStats(data.stats || stats)
          setActiveLines([])
        } else {
          // Fallback to existing communications API if Telnyx fails
          const fallbackResponse = await fetch('/api/aimpact/communications?includeStats=true')
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json()
            // Convert timestamp strings to Date objects
            const communicationsWithDates = (data.communications || []).map((comm: any) => ({
              ...comm,
              timestamp: new Date(comm.timestamp)
            }))
            setCommunications(communicationsWithDates)
            setStats(data.stats || stats)
          }
        }
      } catch (error) {
        console.error('Error fetching communications:', error)
        toast.error("Unable to fetch communications")
      } finally {
        setLoading(false)
      }
    }
    fetchCommunications.current()

    const interval = setInterval(() => {
      if (fetchCommunications.current) {
        fetchCommunications.current()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // WebRTC Functions
  const startWebRTCCall = async (number?: string, videoEnabled: boolean = true) => {
    console.log('startWebRTCCall called with:', { number, videoEnabled });
    
    try {
      setWebRTCCall(prev => ({ 
        ...prev, 
        isConnecting: true, 
        callType: number ? 'pstn' : (videoEnabled ? 'video' : 'audio'),
        phoneNumber: number,
        isVideoOn: videoEnabled
      }))

      // Create Janus session
      console.log('Creating Janus session...');
      const sessionResponse = await fetch("/api/aimpact/webrtc/session", {
        method: "POST",
      })

      console.log('Session response status:', sessionResponse.status);
      
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.text();
        console.error('Session creation failed:', errorData);
        throw new Error(`Failed to create WebRTC session: ${errorData}`)
      }

      const sessionData = await sessionResponse.json()
      const { session, janusWebSocket, iceServers } = sessionData

      // Initiate call
      const callResponse = await fetch("/api/aimpact/webrtc/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          roomId: session.roomId,
          type: number ? "pstn" : (videoEnabled ? "video" : "audio"),
          phoneNumber: number,
          displayName: "AImpact User",
        }),
      })

      if (!callResponse.ok) {
        throw new Error("Failed to initiate call")
      }

      const callData = await callResponse.json()
      
      // Store connection info
      connectionRef.current = {
        sessionId: session.sessionId,
        handleId: callData.handleId,
        roomId: callData.roomId,
      }

      // Get user media
      console.log('Requesting user media...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: true,
        })
        localStreamRef.current = stream

        if (localVideoRef.current && videoEnabled) {
          localVideoRef.current.srcObject = stream
        }
        console.log('User media obtained successfully');
      } catch (mediaError) {
        console.error('Failed to get user media:', mediaError);
        toast.error('Please allow camera/microphone access to make calls');
        throw mediaError;
      }

      // Create WebSocket connection
      const ws = new WebSocket(janusWebSocket)
      connectionRef.current.ws = ws

      ws.onopen = () => {
        console.log("WebSocket connected")
        setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ janus: "keepalive" }))
          }
        }, 30000)
      }

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data)
        console.log("Janus message:", message)

        if (message.jsep) {
          await handleJanusOffer(message.jsep, iceServers)
        }

        if (message.plugindata?.data?.publishers) {
          const publishers = message.plugindata.data.publishers
          setWebRTCCall(prev => ({
            ...prev,
            participants: publishers.map((p: any) => p.display || "Unknown")
          }))
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        toast.error("Connection error")
      }

      setWebRTCCall(prev => ({
        ...prev,
        isActive: true,
        isConnecting: false,
        callId: callData.callId
      }))

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setWebRTCCall(prev => ({ ...prev, callDuration: prev.callDuration + 1 }))
      }, 1000)

      // Close dialpad
      setShowDialpad(false)

    } catch (error) {
      console.error("Call initialization error:", error)
      toast.error("Failed to start call")
      setWebRTCCall(prev => ({ ...prev, isConnecting: false }))
    }
  }

  // Handle Janus WebRTC offer
  const handleJanusOffer = async (jsep: RTCSessionDescriptionInit, iceServers: RTCIceServer[]) => {
    if (!connectionRef.current) return

    const pc = new RTCPeerConnection({ iceServers })
    connectionRef.current.pc = pc

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(jsep))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    if (connectionRef.current.ws?.readyState === WebSocket.OPEN) {
      connectionRef.current.ws.send(
        JSON.stringify({
          janus: "message",
          transaction: Date.now().toString(),
          session_id: connectionRef.current.sessionId,
          handle_id: connectionRef.current.handleId,
          body: { request: "start" },
          jsep: answer,
        })
      )
    }
  }

  // End WebRTC/Telnyx call
  const endWebRTCCall = async () => {
    try {
      // If it's a PSTN call via Telnyx
      if (webRTCCall.callType === 'pstn' && webRTCCall.callId) {
        const response = await fetch('/api/aimpact/phone/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: webRTCCall.phoneNumber,
            callId: webRTCCall.callId,
            action: 'hangup'
          })
        })

        if (!response.ok) {
          const data = await response.json()
          console.error('Telnyx hangup error:', data)
        }
      }
      
      // Clean up WebRTC resources if any
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (connectionRef.current?.pc) {
        connectionRef.current.pc.close()
      }

      if (connectionRef.current?.ws) {
        connectionRef.current.ws.close()
      }

      // Clean up WebRTC session if it exists
      if (webRTCCall.callType !== 'pstn' && webRTCCall.callId && connectionRef.current) {
        await fetch(`/api/aimpact/webrtc/call?callId=${webRTCCall.callId}&action=end`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: connectionRef.current.sessionId,
            handleId: connectionRef.current.handleId,
          }),
        })
      }

      if (connectionRef.current?.sessionId) {
        await fetch(`/api/aimpact/webrtc/session?sessionId=${connectionRef.current.sessionId}&transactionId=${Date.now()}`, {
          method: "DELETE",
        })
      }

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

      setWebRTCCall({
        isActive: false,
        isConnecting: false,
        isMuted: false,
        isVideoOn: true,
        isScreenSharing: false,
        callDuration: 0,
        callId: null,
        participants: [],
        callType: 'audio',
        phoneNumber: undefined
      })

      toast.success('Call ended')
      phoneSounds.playDisconnected()

      // Refresh communications
      if (fetchCommunications.current) {
        fetchCommunications.current()
      }
    } catch (error) {
      console.error("Error ending call:", error)
      toast.error("Error ending call")
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setWebRTCCall(prev => ({ ...prev, isMuted: !audioTrack.enabled }))
      }
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setWebRTCCall(prev => ({ ...prev, isVideoOn: videoTrack.enabled }))
      }
    }
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Dialpad component
  const renderDialpad = () => (
    <Dialog open={showDialpad} onOpenChange={setShowDialpad}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Make a Call</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Number Display */}
          <div className="bg-black/30 rounded-lg p-4">
            <Input
              type="tel"
              placeholder="Enter number..."
              value={dialpadNumber}
              onChange={(e) => setDialpadNumber(e.target.value)}
              className="text-2xl text-center bg-transparent border-0 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Dialpad Grid */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                size="lg"
                onClick={() => {
                  setDialpadNumber(prev => prev + digit)
                  phoneSounds.playDTMF(digit)
                }}
                className="h-16 text-xl font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20 active:bg-white/30 transition-all"
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl">{digit}</span>
                  {digit === '2' && <span className="text-xs mt-1">ABC</span>}
                  {digit === '3' && <span className="text-xs mt-1">DEF</span>}
                  {digit === '4' && <span className="text-xs mt-1">GHI</span>}
                  {digit === '5' && <span className="text-xs mt-1">JKL</span>}
                  {digit === '6' && <span className="text-xs mt-1">MNO</span>}
                  {digit === '7' && <span className="text-xs mt-1">PQRS</span>}
                  {digit === '8' && <span className="text-xs mt-1">TUV</span>}
                  {digit === '9' && <span className="text-xs mt-1">WXYZ</span>}
                  {digit === '0' && <span className="text-xs mt-1">+</span>}
                </div>
              </Button>
            ))}
          </div>

          {/* + Button Row */}
          <div className="grid grid-cols-3 gap-2">
            <div></div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                if (dialpadNumber.length === 0) {
                  setDialpadNumber('+')
                  phoneSounds.playDTMF('+')
                }
              }}
              disabled={dialpadNumber.length > 0}
              className="h-12 text-2xl font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20 active:bg-white/30"
            >
              +
            </Button>
            <div></div>
          </div>

          {/* Call Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Test button to ensure clicks work */}
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[PhoneInterface] Audio call clicked, number:', dialpadNumber);
                if (dialpadNumber) {
                  // Initiate call through Janus widget
                  console.log('[PhoneInterface] Calling phoneIntegration.initiateCall');
                  phoneIntegration.initiateCall(dialpadNumber);
                  toast.info('Initiating call...');
                  // Don't close the dialpad - keep it open to show call status
                  // setShowDialpad(false);
                } else {
                  toast.error('Please enter a phone number');
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone className="w-4 h-4 mr-2" />
              Audio Call
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.info('Video calls coming soon! Use audio calls for now.');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white opacity-50"
              disabled
            >
              <Video className="w-4 h-4 mr-2" />
              Video Call (Coming Soon)
            </Button>
          </div>

          {/* Quick Dial */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-sm text-gray-300 mb-3">Favorites</p>
            <div className="space-y-2">
              {(contacts || []).filter(c => c?.isFavorite).map((contact) => {
                if (!contact) return null;
                return (
                <Card
                  key={contact.id}
                  className="p-3 bg-white/5 border-white/20 hover:bg-white/10 cursor-pointer transition-colors"
                  onClick={() => {
                    setDialpadNumber(contact.number)
                    // Use phone integration to initiate call through Janus
                    phoneIntegration.initiateCall(contact.number);
                    toast.info('Initiating call...');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{(contact?.name || 'U').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-400">{contact.number}</p>
                      </div>
                    </div>
                    <Phone className="w-5 h-5 text-gray-400" />
                  </div>
                </Card>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // Group SMS into conversations
  const smsConversations = useMemo<SMSConversation[]>(() => {
    const conversationMap = new Map<string, SMSConversation>()
    
    communications
      .filter(comm => comm.type === 'sms')
      .forEach(sms => {
        if (!sms.contact) return;
        const display = safeContactDisplay(sms.contact, sms.from)
        const contactNumber = display.primaryHandle
        const existingContact = contacts.find(c => c.number === contactNumber)
        
        if (!conversationMap.has(contactNumber)) {
          conversationMap.set(contactNumber, {
            contactId: existingContact?.id || contactNumber,
            contact: existingContact || { 
              id: contactNumber, 
              name: display.displayName, 
              number: contactNumber 
            },
            messages: [],
            unreadCount: 0
          })
        }
        
        const conversation = conversationMap.get(contactNumber)!
        conversation.messages.push(sms)
        if (sms.status === 'delivered' && sms.direction === 'incoming') {
          conversation.unreadCount++
        }
      })
    
    return Array.from(conversationMap.values()).map(conv => ({
      ...conv,
      lastMessage: conv.messages[conv.messages.length - 1],
      messages: conv.messages.sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
        const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
        return aTime - bTime
      })
    }))
  }, [communications, contacts])

  const filteredCommunications = communications.filter(comm => {
    const display = safeContactDisplay(comm.contact, comm.from)
    const matchesSearch = !searchQuery || 
      display.primaryHandle.includes(searchQuery) ||
      display.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      display.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.message?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = activeTab === 'all' || 
      (activeTab === 'calls' && comm.type === 'call') ||
      (activeTab === 'sms' && comm.type === 'sms') ||
      (activeTab === 'voicemail' && comm.type === 'voicemail')
    
    const matchesStatus = filterStatus === 'all' || comm.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  const getIcon = (record: CommunicationRecord) => {
    if (record.type === 'sms') return <MessageSquare className="h-4 w-4" />
    if (record.type === 'voicemail') return <Voicemail className="h-4 w-4" />
    if (record.type === 'email') return <Mail className="h-4 w-4" />
    
    switch (record.direction) {
      case 'incoming': return <PhoneIncoming className="h-4 w-4 text-green-500" />
      case 'outgoing': return <PhoneOutgoing className="h-4 w-4 text-blue-500" />
      case 'missed': return <PhoneMissed className="h-4 w-4 text-red-500" />
      case 'internal': return <PhoneForwarded className="h-4 w-4 text-purple-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: 'default', icon: CheckCircle },
      missed: { variant: 'destructive', icon: XCircle },
      failed: { variant: 'destructive', icon: AlertCircle },
      active: { variant: 'default', icon: Activity, className: 'bg-green-500' },
      'on-hold': { variant: 'secondary', icon: Timer },
      delivered: { variant: 'secondary', icon: CheckCircle },
      read: { variant: 'default', icon: CheckCircle },
      sending: { variant: 'secondary', icon: Clock }
    }
    
    const config = variants[status] || { variant: 'default' }
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className || ''}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {status}
      </Badge>
    )
  }

  const handleSendSMS = async () => {
    const recipient = smsRecipient || selectedConversation?.contact?.number
    
    if (!smsMessage.trim() || !recipient) {
      toast.error("Please enter a recipient and message")
      return
    }
    
    try {
      toast.info("Sending SMS...")
      
      const response = await fetch('/api/aimpact/phone/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          message: smsMessage
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to send SMS')
      }
      
      toast.success(`Message sent to ${selectedContact?.name || selectedConversation?.contact?.name || recipient}`)
      
      setSmsMessage('')
      setShowSMSCompose(false)
      setSmsRecipient('')
      setSelectedContact(null)
      
      setTimeout(() => {
        if (fetchCommunications.current) {
          fetchCommunications.current()
        }
      }, 1000)
    } catch (error) {
      console.error('SMS Error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to send SMS")
    }
  }

  const handleCall = (number: string) => {
    console.log('handleCall called with number:', number);
    // Initiate call through Janus widget
    phoneIntegration.initiateCall(number);
    toast.info('Initiating call...');
  }

  // Legacy Telnyx API call function - no longer used
  // Keeping for reference but calls now go through Janus WebRTC
  // const makeTelnyxCall = async (phoneNumber: string) => {
  //   // This function used the Telnyx Call Control API which requires
  //   // a different type of connection. We now use Janus WebRTC → SIP
  // }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Active WebRTC Call */}
      {webRTCCall.isActive && (
        <Card className={`relative ${isVideoMaximized ? 'fixed inset-4 z-50' : ''} bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl border-purple-500/30`}>
          {/* Video Container */}
          <div className={`relative ${isVideoMaximized ? 'h-full' : 'aspect-video'} bg-black rounded-t-lg overflow-hidden`}>
            {/* Remote Video */}
            {webRTCCall.callType === 'video' && (
              <video
                ref={remoteVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
            )}

            {/* Local Video PiP */}
            {webRTCCall.callType === 'video' && webRTCCall.isVideoOn && (
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-purple-500/50">
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            )}

            {/* Audio Call Display */}
            {webRTCCall.callType !== 'video' && (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <Phone className="w-16 h-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {webRTCCall.phoneNumber || "WebRTC Audio Call"}
                  </h3>
                  <p className="text-xl text-gray-300">{formatDuration(webRTCCall.callDuration)}</p>
                </div>
              </div>
            )}

            {/* Call Info Overlay */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white font-medium">
                  {webRTCCall.phoneNumber || "WebRTC Call"}
                </span>
                <span className="text-gray-300">{formatDuration(webRTCCall.callDuration)}</span>
              </div>
              {webRTCCall.participants.length > 0 && (
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{webRTCCall.participants.join(", ")}</span>
                </div>
              )}
            </div>

            {/* Maximize/Minimize Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsVideoMaximized(!isVideoMaximized)}
              className="absolute top-4 right-4 bg-black/50 border-white/30 hover:bg-black/70"
            >
              {isVideoMaximized ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </Button>

            {/* Connecting Overlay */}
            {webRTCCall.isConnecting && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-lg">Connecting...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className={`rounded-full w-14 h-14 ${
                  webRTCCall.isMuted
                    ? "bg-red-500/20 border-red-500 hover:bg-red-500/30"
                    : "bg-white/10 border-white/30 hover:bg-white/20"
                }`}
              >
                {webRTCCall.isMuted ? (
                  <MicOff className="w-6 h-6 text-red-500" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </Button>

              {/* Video Button */}
              {webRTCCall.callType === 'video' && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleVideo}
                  className={`rounded-full w-14 h-14 ${
                    !webRTCCall.isVideoOn
                      ? "bg-red-500/20 border-red-500 hover:bg-red-500/30"
                      : "bg-white/10 border-white/30 hover:bg-white/20"
                  }`}
                >
                  {!webRTCCall.isVideoOn ? (
                    <VideoOff className="w-6 h-6 text-red-500" />
                  ) : (
                    <Video className="w-6 h-6 text-white" />
                  )}
                </Button>
              )}

              {/* End Call Button */}
              <Button
                variant="destructive"
                size="icon"
                onClick={endWebRTCCall}
                className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-8 h-8" />
              </Button>

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-14 h-14 bg-white/10 border-white/30 hover:bg-white/20"
                  >
                    <MoreVertical className="w-6 h-6 text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                  <DropdownMenuItem className="text-white hover:bg-gray-800">
                    <Monitor className="w-4 h-4 mr-2" />
                    Share Screen
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white hover:bg-gray-800">
                    <Users className="w-4 h-4 mr-2" />
                    Add Participant
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white hover:bg-gray-800">
                    <Hash className="w-4 h-4 mr-2" />
                    Dialpad
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>
      )}

      {/* Phone and Testing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Phone Card */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone System
            </CardTitle>
            <CardDescription>Make calls using Janus WebRTC</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Number Display */}
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <Input
                type="tel"
                placeholder="Enter number..."
                value={inlineDialpadNumber}
                onChange={(e) => setInlineDialpadNumber(e.target.value)}
                className="text-2xl text-center bg-transparent border-0 text-white placeholder:text-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inlineDialpadNumber) {
                    phoneIntegration.initiateCall(inlineDialpadNumber);
                    toast.info('Initiating call...');
                  }
                }}
              />
            </div>

            {/* Dialpad Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setInlineDialpadNumber(prev => prev + digit)
                    phoneSounds.playDTMF(digit)
                  }}
                  className="h-14 text-lg font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20 active:bg-white/30 transition-all"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xl">{digit}</span>
                    {digit === '2' && <span className="text-xs">ABC</span>}
                    {digit === '3' && <span className="text-xs">DEF</span>}
                    {digit === '4' && <span className="text-xs">GHI</span>}
                    {digit === '5' && <span className="text-xs">JKL</span>}
                    {digit === '6' && <span className="text-xs">MNO</span>}
                    {digit === '7' && <span className="text-xs">PQRS</span>}
                    {digit === '8' && <span className="text-xs">TUV</span>}
                    {digit === '9' && <span className="text-xs">WXYZ</span>}
                    {digit === '0' && <span className="text-xs">+</span>}
                  </div>
                </Button>
              ))}
            </div>

            {/* + Button Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div></div>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  if (inlineDialpadNumber.length === 0) {
                    setInlineDialpadNumber('+')
                    phoneSounds.playDTMF('+')
                  }
                }}
                disabled={inlineDialpadNumber.length > 0}
                className="h-10 text-xl font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20 active:bg-white/30"
              >
                +
              </Button>
              <div></div>
            </div>

            {/* Call Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  if (inlineDialpadNumber) {
                    phoneIntegration.initiateCall(inlineDialpadNumber);
                    toast.info('Initiating call...');
                  } else {
                    toast.error('Please enter a phone number');
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Phone className="w-4 h-4 mr-2" />
                Audio Call
              </Button>
              <Button
                variant="outline"
                onClick={() => setInlineDialpadNumber('')}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Testing Card */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Phone System Testing
            </CardTitle>
            <CardDescription>Test your phone system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="p-4 bg-black/30 rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-white mb-2">Connection Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Janus Server</span>
                  <Badge variant="default" className="bg-green-500">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">SIP Registration</span>
                  <Badge variant="secondary">Server-side</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Active Calls</span>
                  <span className="text-white font-medium">{phoneIntegration.activeCalls.length}</span>
                </div>
              </div>
            </div>

            {/* Test Numbers */}
            <div className="p-4 bg-black/30 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-3">Quick Test Numbers</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-between bg-white/5 border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    phoneIntegration.initiateCall('+12602794654');
                    toast.info('Calling your Telnyx number...');
                  }}
                >
                  <span className="text-sm">Your Telnyx Number</span>
                  <span className="text-xs font-mono">+1 (260) 279-4654</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-white/5 border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    phoneIntegration.initiateCall('+18883835768');
                    toast.info('Calling Telnyx echo test...');
                  }}
                >
                  <span className="text-sm">Echo Test</span>
                  <span className="text-xs font-mono">+1 (888) 383-5768</span>
                </Button>
              </div>
            </div>

            {/* Debug Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => {
                  console.log('Phone Integration State:', phoneIntegration);
                  toast.info('Check console for debug info');
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Log Debug Info
              </Button>
              <Button
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => {
                  window.open('/test-janus', '_blank');
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
                Open Test Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Stats */}
      <DraggableGrid
        storageKey="phone-stats"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-4"
        enabled={true}
      >
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Total Calls</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.totalCalls}</p>
              </div>
              <Phone className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Missed</p>
                <p className="text-lg lg:text-2xl font-bold text-red-500">{stats.missedCalls}</p>
              </div>
              <PhoneMissed className="h-6 lg:h-8 w-6 lg:w-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">SMS Sent</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.totalSMS}</p>
              </div>
              <MessageSquare className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Unread SMS</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.unreadSMS}</p>
              </div>
              <MessageCircle className="h-6 lg:h-8 w-6 lg:w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Total Emails</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.totalEmails}</p>
              </div>
              <Mail className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Unread Emails</p>
                <p className="text-lg lg:text-2xl font-bold text-orange-500">{stats.unreadEmails}</p>
              </div>
              <Mail className="h-6 lg:h-8 w-6 lg:w-8 text-orange-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.avgDuration}</p>
              </div>
              <Clock className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Active Calls</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg lg:text-2xl font-bold text-green-500">{stats.activeCalls}</p>
                  {stats.activeCalls > 0 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowActiveCallsDialog(true)}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
              <PhoneOutgoing className="h-6 lg:h-8 w-6 lg:w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Active Agents</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.activeAgents}</p>
              </div>
              <Headphones className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">In Queue</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.inQueue}</p>
              </div>
              <Users className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/30 backdrop-blur-md">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">SLA</p>
                <div className="flex items-center gap-1 lg:gap-2">
                  <p className="text-lg lg:text-2xl font-bold">{stats.sla}%</p>
                  <TrendingUp className="h-3 lg:h-4 w-3 lg:w-4 text-green-500" />
                </div>
              </div>
              <Activity className="h-6 lg:h-8 w-6 lg:w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </DraggableGrid>

      {/* Quick Actions Bar */}
      <Card className="bg-card/30 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowDialpad(true)} className="gap-2">
              <Hash className="h-4 w-4" />
              Dialpad
            </Button>
            <Button 
              onClick={() => setShowSMSCompose(true)} 
              variant="outline" 
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              New SMS
            </Button>
            <Button 
              onClick={() => startWebRTCCall(undefined, true)} 
              variant="outline" 
              className="gap-2"
            >
              <Video className="h-4 w-4" />
              Video Call
            </Button>
            
            {/* Contact Dropdown */}
            <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search contacts..." />
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem className="font-medium text-sm opacity-60">
                      Favorites
                    </CommandItem>
                    {(contacts || []).filter(c => c?.isFavorite).map((contact) => {
                if (!contact) return null;
                return (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => {
                          setSelectedContact(contact)
                          setContactSearchOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{(contact?.name || 'U').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.number}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCall(contact.number)
                              }}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedContact(contact)
                                setSmsRecipient(contact.number)
                                setShowSMSCompose(true)
                                setContactSearchOpen(false)
                              }}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CommandItem>
                      );
                    })}
                    <Separator className="my-2" />
                    <CommandItem className="font-medium text-sm opacity-60">
                      All Contacts
                    </CommandItem>
                    {(contacts || []).filter(c => c && !c.isFavorite).map((contact) => {
                      if (!contact) return null;
                      return (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => {
                          setSelectedContact(contact)
                          setContactSearchOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{(contact?.name || 'U').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.number}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCall(contact.number)
                              }}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedContact(contact)
                                setSmsRecipient(contact.number)
                                setShowSMSCompose(true)
                                setContactSearchOpen(false)
                              }}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex-1" />
            
            {/* Filters on the right */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Communications Interface */}
      <Card className="bg-card/30 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Communications Center</CardTitle>
              <CardDescription>Unified view of all calls, SMS, and voicemails</CardDescription>
            </div>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, number, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="voicemail">Voicemail</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {activeTab === 'sms' ? (
                // SMS Conversations View
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Conversations List */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Conversations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        {smsConversations.map((conversation) => (
                          <div
                            key={conversation.contactId}
                            className={`p-4 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                              selectedConversation?.contactId === conversation.contactId ? 'bg-accent' : ''
                            }`}
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {(() => {
                                    const display = safeContactDisplay(conversation.contact, conversation.contact?.number)
                                    return display.initials
                                  })()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium truncate">{safeContactDisplay(conversation.contact, conversation.contact?.number).displayName}</p>
                                  {conversation.unreadCount > 0 && (
                                    <Badge variant="default" className="ml-2">
                                      {conversation.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{safeContactDisplay(conversation.contact, conversation.contact?.number).primaryHandle}</p>
                                {conversation.lastMessage && (
                                  <p className="text-sm text-muted-foreground truncate mt-1">
                                    {conversation.lastMessage.direction === 'outgoing' && 'You: '}
                                    {conversation.lastMessage.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Conversation Messages */}
                  <Card className="lg:col-span-2">
                    {selectedConversation ? (
                      <>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {(() => {
                                    const display = safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number)
                                    return display.initials
                                  })()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number).displayName}</p>
                                <p className="text-sm text-muted-foreground">{safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number).primaryHandle}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleCall(safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number).primaryHandle)}>
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[350px] mb-4">
                            <div className="space-y-4">
                              {selectedConversation.messages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-[70%] ${
                                    message.direction === 'outgoing' 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted'
                                  } rounded-lg px-4 py-2`}>
                                    <p className="text-sm">{message.message}</p>
                                    <p className={`text-xs mt-1 ${
                                      message.direction === 'outgoing' 
                                        ? 'text-primary-foreground/70' 
                                        : 'text-muted-foreground'
                                    }`}>
                                      {(() => {
                                        try {
                                          const date = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
                                          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        } catch (e) {
                                          return 'Invalid time'
                                        }
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Type a message..."
                              value={smsMessage}
                              onChange={(e) => setSmsMessage(e.target.value)}
                              className="min-h-[60px] max-h-[120px] resize-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  if (selectedConversation && smsMessage.trim()) {
                                    const display = safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number)
                                    setSmsRecipient(display.primaryHandle)
                                    handleSendSMS()
                                  }
                                }
                              }}
                            />
                            <Button 
                              onClick={() => {
                                if (selectedConversation && smsMessage.trim()) {
                                  const display = safeContactDisplay(selectedConversation.contact, selectedConversation.contact?.number)
                                  setSmsRecipient(display.primaryHandle)
                                  handleSendSMS()
                                }
                              }} 
                              disabled={!smsMessage.trim() || !selectedConversation}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
                        Select a conversation to view messages
                      </CardContent>
                    )}
                  </Card>
                </div>
              ) : (
                // Regular Table View for Calls/All
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration/Message</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                              Loading communications...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredCommunications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No communications found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCommunications.map((record) => (
                          <TableRow 
                            key={record.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedRecord(record)
                              setShowDetailPanel(true)
                            }}
                          >
                            <TableCell>{getIcon(record)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {(record.contact?.name || '#').split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {record.contact.name || record.contact.number}
                                  </p>
                                  {record.contact.name && (
                                    <p className="text-xs text-muted-foreground">{record.contact.number}</p>
                                  )}
                                  {record.contact.company && (
                                    <p className="text-xs text-muted-foreground">{record.contact.company}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {record.type === 'call' && record.recording && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="h-2 w-2 bg-red-500 rounded-full" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Recording available</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <span className="capitalize text-sm">{record.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.duration ? (
                                <span className="font-mono text-sm">{record.duration}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                                  {record.message}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{record.agent}</TableCell>
                            <TableCell className="text-sm">{record.department}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {(() => {
                                try {
                                  const date = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp)
                                  return date.toLocaleString()
                                } catch (e) {
                                  return 'Invalid date'
                                }
                              })()}
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleCall(record.contact.number)}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Call Back
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSmsRecipient(record.contact.number)
                                    setSelectedContact(contacts.find(c => c.number === record.contact.number) || null)
                                    setShowSMSCompose(true)
                                  }}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Send SMS
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {record.recording && (
                                    <DropdownMenuItem>
                                      <Play className="h-4 w-4 mr-2" />
                                      Play Recording
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialpad Modal */}
      {renderDialpad()}

      {/* SMS Compose Dialog */}
      <Dialog 
        open={showSMSCompose} 
        onOpenChange={(open) => {
          setShowSMSCompose(open)
          if (!open) {
            setSmsMessage('')
            setSmsRecipient('')
            setSelectedContact(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New SMS Message</DialogTitle>
            <DialogDescription>
              Send a text message to a contact or phone number
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter phone number or select contact"
                  value={selectedContact ? `${selectedContact.name} (${selectedContact.number})` : smsRecipient}
                  onChange={(e) => {
                    setSmsRecipient(e.target.value)
                    setSelectedContact(null)
                  }}
                  className="flex-1"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Users className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 sm:w-80 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search contacts..." />
                      <CommandEmpty>No contacts found.</CommandEmpty>
                      <CommandGroup>
                        {(contacts || []).map((contact) => {
                          if (!contact) return null;
                          return (
                          <CommandItem
                            key={contact.id}
                            onSelect={() => {
                              setSelectedContact(contact)
                              setSmsRecipient(contact.number)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{(contact?.name || 'U').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{contact.name}</p>
                                <p className="text-xs text-muted-foreground">{contact.number}</p>
                              </div>
                            </div>
                          </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {smsMessage.length} / 160 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSMSCompose(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendSMS} 
              disabled={!smsMessage.trim() || !smsRecipient}
            >
              <Send className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Panel - Slide Out */}
      <AnimatePresence>
        {selectedRecord && showDetailPanel && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l shadow-lg z-50"
          >
            <div className="flex flex-col h-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Communication Details</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowDetailPanel(false)
                      setTimeout(() => setSelectedRecord(null), 300)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {(selectedRecord.contact?.name || '#').split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedRecord.contact.name || selectedRecord.contact.number}</p>
                    {selectedRecord.contact.company && (
                      <p className="text-sm text-muted-foreground">{selectedRecord.contact.company}</p>
                    )}
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Communication Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="capitalize">{selectedRecord.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Direction</span>
                        <span className="capitalize">{selectedRecord.direction}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(selectedRecord.status)}
                      </div>
                      {selectedRecord.duration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-mono">{selectedRecord.duration}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span>{(() => {
                          try {
                            const date = selectedRecord.timestamp instanceof Date ? selectedRecord.timestamp : new Date(selectedRecord.timestamp)
                            return date.toLocaleString()
                          } catch (e) {
                            return 'Invalid date'
                          }
                        })()}</span>
                      </div>
                    </div>
                  </div>

                  {selectedRecord.message && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {selectedRecord.type === 'voicemail' ? 'Transcription' : 'Message'}
                      </h4>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedRecord.message}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCall(selectedRecord.contact.number)}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Back
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setSmsRecipient(selectedRecord.contact.number)
                        setSelectedContact(contacts.find(c => c.number === selectedRecord.contact.number) || null)
                        setShowSMSCompose(true)
                      }}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send SMS
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        View Contact
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="notes">Add Note</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add a note about this communication..."
                      className="min-h-[100px]"
                    />
                    <Button size="sm" className="w-full">
                      Save Note
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Active Calls Dialog */}
      <Dialog open={showActiveCallsDialog} onOpenChange={setShowActiveCallsDialog}>
        <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Active Calls ({phoneIntegration.activeCalls.length})
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Manage your active SIP connections
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {phoneIntegration.activeCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active calls</p>
              </div>
            ) : (
              <div className="space-y-3">
                {phoneIntegration.activeCalls.map((call) => (
                  <Card key={call.id} className="bg-white/10 border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full animate-pulse ${
                            call.status === 'active' ? 'bg-green-500' : 
                            call.status === 'ringing' ? 'bg-yellow-500' : 
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="font-semibold text-white">{call.phoneNumber}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-300">
                              <span className="capitalize">{call.status}</span>
                              <span>{call.direction}</span>
                              <span>{formatDuration(call.duration)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {call.isMuted && (
                            <Badge variant="destructive" className="text-xs">
                              <MicOff className="h-3 w-3 mr-1" />
                              Muted
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              // Request the call to be ended
                              phoneIntegration.requestEndCall(call.id);
                              toast.info('Ending call...');
                            }}
                          >
                            <PhoneOff className="h-4 w-4 mr-1" />
                            End
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {phoneIntegration.activeCalls.length > 1 && (
              <div className="pt-4 border-t border-white/20">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    phoneIntegration.endAllCalls();
                    toast.info('All calls ended');
                    setShowActiveCallsDialog(false);
                  }}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End All Calls
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}