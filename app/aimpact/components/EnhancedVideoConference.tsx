'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  StreamVideo,
  StreamVideoClient,
  Call,
  StreamCall,
  StreamTheme,
  useCallStateHooks,
  CallingState,
  SpeakerLayout,
  PaginatedGridLayout,
  CallControls,
  User,
  useCall,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { 
  Users, UserPlus, Copy, Check, Grid3x3, Square,
  Maximize, Minimize, Circle, Settings,
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MonitorOff, MessageSquare, X, Send,
  Eye, Layout, Presentation, PictureInPicture2,
  Loader2, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { streamVideoManager } from '@/lib/stream-video-singleton';

// Custom call controls with AImpact Nexus branding
const CustomCallControls = () => {
  const call = useCall();
  const { useMicrophoneState, useCameraState, useScreenShareState } = useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState();
  const { camera, isCameraOn } = useCameraState();
  const { screenShare, isScreenSharing } = useScreenShareState();

  return (
    <div className="flex items-center justify-center gap-3 p-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
      <Button
        variant={isMute ? "destructive" : "secondary"}
        size="icon"
        onClick={() => microphone.toggle()}
        className="h-12 w-12 rounded-xl"
      >
        {isMute ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      
      <Button
        variant={!isCameraOn ? "destructive" : "secondary"}
        size="icon"
        onClick={() => camera.toggle()}
        className="h-12 w-12 rounded-xl"
      >
        {!isCameraOn ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </Button>
      
      <Button
        variant={isScreenSharing ? "default" : "secondary"}
        size="icon"
        onClick={() => screenShare.toggle()}
        className="h-12 w-12 rounded-xl"
      >
        <Monitor className="h-5 w-5" />
      </Button>
      
      <Button
        variant="destructive"
        size="icon"
        onClick={() => call?.leave()}
        className="h-12 w-12 rounded-xl"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
};

// Video room component with enhanced UI
const VideoRoom = ({ callId }: { callId: string }) => {
  const call = useCall();
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const [copied, setCopied] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'speaker' | 'sidebar'>('grid');
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{id: string, user: string, message: string, timestamp: Date}[]>([]);

  const getMeetingLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/aimpact?video=${callId}`;
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(getMeetingLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Meeting link copied!');
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      user: call?.state.localParticipant?.name || 'You',
      message: chatMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage('');
    
    // Send via Stream custom events
    call?.sendCustomEvent({
      type: 'chat.message',
      data: newMessage
    });
  };

  // Listen for chat messages
  useEffect(() => {
    if (!call) return;
    
    const handleCustomEvent = (event: any) => {
      if (event.type === 'chat.message' && event.user.id !== call.state.localParticipant?.userId) {
        setChatMessages(prev => [...prev, event.data]);
      }
    };
    
    call.on('custom', handleCustomEvent);
    return () => call.off('custom', handleCustomEvent);
  }, [call]);

  if (callingState === CallingState.JOINING) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Joining AImpact Nexus Conference...</p>
        </div>
      </div>
    );
  }

  if (callingState === CallingState.LEFT) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <PhoneOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Call Ended</h3>
            <p className="text-muted-foreground">You have left the conference.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-500">LIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">{participants.length} participants</span>
          </div>
          <Badge variant="outline" className="border-primary/50 text-primary">
            AImpact Nexus
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={layoutMode} onValueChange={(value: any) => setLayoutMode(value)}>
            <SelectTrigger className="w-[140px] h-9">
              <Layout className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">
                <div className="flex items-center">
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid View
                </div>
              </SelectItem>
              <SelectItem value="speaker">
                <div className="flex items-center">
                  <Presentation className="h-4 w-4 mr-2" />
                  Speaker View
                </div>
              </SelectItem>
              <SelectItem value="sidebar">
                <div className="flex items-center">
                  <Square className="h-4 w-4 mr-2" />
                  Sidebar View
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
            {chatMessages.length > 0 && (
              <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {chatMessages.length}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyMeetingLink}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          {layoutMode === 'grid' && (
            <PaginatedGridLayout />
          )}
          {layoutMode === 'speaker' && (
            <SpeakerLayout participantsBarPosition="bottom" />
          )}
          {layoutMode === 'sidebar' && (
            <SpeakerLayout participantsBarPosition="right" />
          )}
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/10 bg-black/40 backdrop-blur-xl"
            >
              <div className="h-full flex flex-col p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Chat</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChat(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-3">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-primary">{msg.user}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendChatMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-xl">
        <CustomCallControls />
      </div>
    </div>
  );
};

export default function EnhancedVideoConference() {
  const { data: session, status } = useSession();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [callId, setCallId] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Initialize Stream client
  useEffect(() => {
    if (status === 'loading') return;
    
    const initClient = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        if (!apiKey) {
          setError('Stream.io API key not configured');
          return;
        }

        // Get user info from session or URL params
        const urlParams = new URLSearchParams(window.location.search);
        const urlName = urlParams.get('name');
        const roomId = urlParams.get('room') || urlParams.get('video');
        
        // Determine user info
        let userId: string;
        let userName: string;
        let userImage: string;
        
        if (session?.user) {
          userId = session.user.id || session.user.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'user';
          userName = session.user.name || session.user.email?.split('@')[0] || urlName || 'Guest';
          userImage = session.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
        } else if (urlName) {
          userId = `guest-${urlName.replace(/[^a-zA-Z0-9]/g, '_')}`;
          userName = urlName;
          userImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
        } else {
          // Allow guest access
          userId = `guest-${Date.now()}`;
          userName = 'Guest User';
          userImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
        }

        // Get token from API - using GET method like in working aether implementation
        const tokenResponse = await fetch(`/api/stream-token?userId=${userId}&service=video`);

        if (!tokenResponse.ok) {
          throw new Error('Failed to get authentication token');
        }

        const { token } = await tokenResponse.json();

        // Get or create client using singleton
        const videoClient = await streamVideoManager.getClient(
          apiKey,
          { id: userId, name: userName, image: userImage },
          token
        );

        setClient(videoClient);

        // If room ID in URL, auto-join
        if (roomId) {
          setCallId(roomId);
          setTimeout(() => joinCall(roomId), 500);
        }
      } catch (err) {
        console.error('Failed to initialize Stream client:', err);
        setError('Failed to initialize video system');
      }
    };

    initClient();

    return () => {
      streamVideoManager.disconnect();
    };
  }, [status, session]);

  const createCall = async () => {
    if (!client || !callId) {
      setError('Please enter a meeting ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newCall = client.call('default', callId);
      await newCall.getOrCreate();
      await newCall.join();
      setCall(newCall);
      setIsInCall(true);
    } catch (err) {
      console.error('Failed to create call:', err);
      setError('Failed to create video call');
    } finally {
      setLoading(false);
    }
  };

  const joinCall = async (id?: string) => {
    const meetingId = id || callId;
    if (!client || !meetingId) {
      setError('Please enter a meeting ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newCall = client.call('default', meetingId);
      await newCall.join();
      setCall(newCall);
      setIsInCall(true);
      setCallId(meetingId);
    } catch (err) {
      console.error('Failed to join call:', err);
      setError('Failed to join video call');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomId = () => {
    const randomId = `nexus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCallId(randomId);
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Initializing AImpact Nexus Video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {!isInCall ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center h-full p-4"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                AImpact Nexus Video Conference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting ID</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter or generate meeting ID"
                    value={callId}
                    onChange={(e) => setCallId(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    variant="outline"
                    onClick={generateRandomId}
                    disabled={loading}
                  >
                    Generate
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={createCall}
                  disabled={loading || !callId}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4 mr-2" />
                  )}
                  Start Meeting
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => joinCall()}
                  disabled={loading || !callId}
                >
                  Join Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        client && call && (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <VideoRoom callId={callId} />
            </StreamCall>
          </StreamVideo>
        )
      )}
    </div>
  );
}