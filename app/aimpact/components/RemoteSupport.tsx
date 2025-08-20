'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Monitor, Mouse, Keyboard, Wifi, WifiOff, Lock, Unlock,
  Download, Upload, Play, Pause, StopCircle, Settings,
  Maximize2, Minimize2, RefreshCw, AlertCircle, Shield,
  Users, MonitorSpeaker, Clipboard, FolderOpen, Loader2,
  CheckCircle, XCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface SessionData {
  sessionId: string
  sessionCode: string
  connectionUrl: string
  expiresAt: string
}

export default function RemoteSupport() {
  const [sessionCode, setSessionCode] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Start a real remote support session
  const startRealSession = async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/aimpact/remote-support/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: `client_${Date.now()}`,
          hostname: window.location.hostname, // In production, this would be the client's IP
          port: 3389, // RDP port
          protocol: 'rdp'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      setSessionData(data)
      setSessionCode(data.sessionCode)
      setConnectionStatus('connecting')
      
      toast.success('Session Created', {
        description: `Share this code with the technician: ${data.sessionCode}`,
      })
    } catch (err) {
      console.error('Failed to start session:', err)
      setError('Failed to create remote support session. Please try again.')
      toast.error('Session Creation Failed', {
        description: 'Could not establish remote support connection.',
      })
    } finally {
      setIsConnecting(false)
    }
  }

  // Start demo session (existing functionality)
  const startDemoSession = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`
    setSessionCode(formattedCode)
    setIsDemo(true)
    toast.success('Demo Session Started', {
      description: `Share this code with the client: ${formattedCode}`,
    })
  }

  // Join a real remote support session
  const joinRealSession = async () => {
    if (sessionCode.length !== 7) {
      toast.error('Invalid Session Code', {
        description: 'Please enter a valid 6-character code (e.g., ABC-123)',
      })
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/aimpact/remote-support/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode })
      })

      if (!response.ok) {
        throw new Error('Failed to join session')
      }

      const data = await response.json()
      setSessionData(data)
      setConnectionStatus('connected')
      
      toast.success('Connected to Session', {
        description: 'Remote support connection established.',
      })
    } catch (err) {
      console.error('Failed to join session:', err)
      setError('Invalid or expired session code. Please check and try again.')
      toast.error('Connection Failed', {
        description: 'Could not join the remote support session.',
      })
    } finally {
      setIsConnecting(false)
    }
  }

  // Join demo session (existing functionality)
  const joinDemoSession = () => {
    if (sessionCode.length === 7) {
      setIsDemo(true)
      toast.success('Connected to Demo Session', {
        description: 'This is a demonstration of the remote support interface',
      })
    } else {
      toast.error('Invalid Session Code', {
        description: 'Please enter a valid 6-character code (e.g., ABC-123)',
      })
    }
  }

  // End remote support session
  const endSession = async () => {
    if (sessionData) {
      try {
        await fetch('/api/aimpact/remote-support/end-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionData.sessionId,
            username: `support_${sessionData.sessionId}`
          })
        })
      } catch (err) {
        console.error('Failed to end session:', err)
      }
    }

    setSessionData(null)
    setConnectionStatus('disconnected')
    setIsDemo(false)
    setSessionCode('')
    setError(null)
    
    toast.info('Session Ended', {
      description: 'The remote support session has been terminated',
    })
  }

  // Monitor session expiry
  useEffect(() => {
    if (sessionData) {
      const checkExpiry = setInterval(() => {
        if (new Date(sessionData.expiresAt) < new Date()) {
          endSession()
          toast.warning('Session Expired', {
            description: 'The remote support session has expired.',
          })
        }
      }, 60000) // Check every minute

      return () => clearInterval(checkExpiry)
    }
  }, [sessionData])

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-200">
          <strong>Remote Support Beta</strong> - Remote support is now available using Apache Guacamole. 
          Start a session below or try demo mode to preview the interface.
        </AlertDescription>
      </Alert>

      {!isDemo ? (
        // Session setup
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Get Support
              </CardTitle>
              <CardDescription>
                Allow a technician to remotely access your computer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  You control what the technician can do. You can revoke access at any time.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={startRealSession}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Monitor className="mr-2 h-4 w-4" />
                  )}
                  Start Remote Session
                </Button>
                
                <Button 
                  className="w-full" 
                  size="sm"
                  variant="outline"
                  onClick={startDemoSession}
                >
                  Try Demo Mode
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>When remote support is available:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>You'll get a 6-digit code to share</li>
                  <li>The technician needs your permission to control</li>
                  <li>Your screen will be shared when connected</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Provide Support
              </CardTitle>
              <CardDescription>
                Connect to a customer's computer to help them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-code">Session Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="session-code"
                    placeholder="ABC-123"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    className="text-center text-2xl font-mono"
                    maxLength={7}
                  />
                  <Button 
                    onClick={joinRealSession}
                    disabled={!sessionCode || sessionCode.length !== 7 || isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Recent Sessions</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded border opacity-50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">John Doe</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" disabled>
                      Reconnect
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : sessionData && !isDemo ? (
        // Real Guacamole session
        <div className="space-y-4">
          {/* Session header */}
          <Card className="bg-card/30 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'connected' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : connectionStatus === 'connecting' ? (
                      <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {connectionStatus === 'connected' ? 'Connected' : 
                       connectionStatus === 'connecting' ? 'Connecting...' : 
                       'Connection Error'}
                    </span>
                  </div>
                  
                  <Badge variant="outline" className="text-lg font-mono">
                    {sessionCode}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-sm text-muted-foreground">
                      Expires: {new Date(sessionData.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(sessionData.connectionUrl, '_blank')}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={endSession}
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    End Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guacamole iframe */}
          <Card className="bg-black min-h-[600px]">
            <CardContent className="p-0">
              <iframe
                ref={iframeRef}
                src={sessionData.connectionUrl}
                className="w-full h-[600px] border-0 rounded-lg"
                allow="clipboard-read; clipboard-write"
                onLoad={() => setConnectionStatus('connected')}
                onError={() => setConnectionStatus('error')}
              />
            </CardContent>
          </Card>
        </div>
      ) : isDemo ? (
        // Demo active session (existing code)
        <div className="space-y-4">
          {/* Session header */}
          <Card className="bg-card/30 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Demo Connected</span>
                  </div>
                  
                  <Badge variant="outline" className="text-lg font-mono">
                    {sessionCode}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-sm text-muted-foreground">
                      Connected to: Demo User
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Request Control
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={endSession}
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    End Demo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main content area */}
          <div className="grid gap-4 lg:grid-cols-[1fr,300px]">
            {/* Screen display */}
            <Card className="bg-black min-h-[500px]">
              <CardContent className="p-0">
                <div className="relative h-full min-h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="h-16 w-16 text-gray-600 mb-4 mx-auto" />
                    <p className="text-gray-400 text-lg">Remote Screen Preview</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Screen sharing will appear here when available
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control panel */}
            <div className="space-y-4">
              <Card className="bg-card/30 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled
                  >
                    <Keyboard className="mr-2 h-4 w-4" />
                    Ctrl+Alt+Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled
                  >
                    <Clipboard className="mr-2 h-4 w-4" />
                    Sync Clipboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    File Transfer
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/30 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Session Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">00:00:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connection</span>
                    <Badge variant="outline" className="text-xs">
                      Demo Mode
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality</span>
                    <span className="font-medium text-green-500">Excellent</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Screen Share</span>
                      <Badge variant="secondary">View Only</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Clipboard</span>
                      <Badge variant="secondary">Disabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">File Transfer</span>
                      <Badge variant="secondary">Disabled</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {/* Error display */}
      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Feature roadmap */}
      <Card className="bg-card/30 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg">Remote Support Features</CardTitle>
          <CardDescription>
            Powered by Apache Guacamole
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-500"></div>
              <div>
                <p className="font-medium">✅ Screen Sharing & Remote Control</p>
                <p className="text-sm text-muted-foreground">Full remote desktop access with RDP/VNC support</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-500"></div>
              <div>
                <p className="font-medium">✅ Secure Session Management</p>
                <p className="text-sm text-muted-foreground">Time-limited sessions with automatic cleanup</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-500"></div>
              <div>
                <p className="font-medium">✅ Web-Based Access</p>
                <p className="text-sm text-muted-foreground">No client installation required - pure HTML5</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500"></div>
              <div>
                <p className="font-medium">🚧 File Transfer</p>
                <p className="text-sm text-muted-foreground">Drag-and-drop file sharing (coming soon)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500"></div>
              <div>
                <p className="font-medium">🚧 Session Recording</p>
                <p className="text-sm text-muted-foreground">Record support sessions for training/compliance</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}