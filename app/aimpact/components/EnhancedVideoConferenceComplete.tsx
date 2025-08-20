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
  CallParticipantsList,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  ScreenShareButton,
  RecordCallButton,
  CallStatsButton,
  ToggleAudioOutputButton,
  User,
  useCall,
  useConnectedUser,
  DeviceSettings,
  ParticipantView,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import '@/styles/pip-fix.css';
import { 
  Users, UserPlus, Copy, Check, Grid3x3, Square,
  Maximize, Minimize, Circle, Settings,
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MonitorOff, MessageSquare, X, Send,
  Eye, Layout, Presentation, PictureInPicture2,
  Loader2, ChevronDown, Smile, MoreVertical
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { streamVideoManager } from '@/lib/stream-video-singleton';
import { InviteToCallModal } from '@/components/video-meet/InviteToCallModal';

// Participant Count Component
const ParticipantCount = () => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-lg">
      <Users className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-300">{participants.length}</span>
    </div>
  );
};

// Custom Call Controls with all device options
const CustomCallControls = ({ onDeviceSettings }: { onDeviceSettings: () => void }) => {
  const call = useCall();
  const { useMicrophoneState, useCameraState, useScreenShareState } = useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState();
  const { camera, isCameraOn } = useCameraState();
  const { screenShare, isScreenSharing } = useScreenShareState();

  return (
    <div className="flex items-center justify-center gap-3 p-4">
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-2">
        <ToggleAudioPublishingButton />
        <ToggleVideoPublishingButton />
        <ScreenShareButton />
        <RecordCallButton />
        <ToggleAudioOutputButton />
        <CallStatsButton />
        
        <Button
          size="icon"
          variant="ghost"
          onClick={onDeviceSettings}
          className="h-10 w-10 hover:bg-white/10"
          title="Device Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <Button
          variant="destructive"
          size="icon"
          onClick={() => call?.leave()}
          className="h-10 w-10"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

// Video Room Component with ALL features
const VideoRoomComplete = ({ callId, userName }: { callId: string; userName: string }) => {
  const call = useCall();
  const connectedUser = useConnectedUser();
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  
  const [copied, setCopied] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'speaker' | 'sidebar' | 'spotlight'>('grid');
  const [showChat, setShowChat] = useState(false); // Start with chat closed
  const [showInvite, setShowInvite] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{id: string, user: string, message: string, timestamp: Date}[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0); // Track unread messages
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];

  // Get meeting link with user name
  const getMeetingLink = () => {
    const baseUrl = window.location.origin;
    const userNameParam = userName ? `&name=${encodeURIComponent(userName)}` : '';
    return `${baseUrl}/aimpact?video=${callId}${userNameParam}`;
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(getMeetingLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Meeting link copied with your name!');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPMode(false);
        return;
      }

      const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
      const sourceVideo = videos
        .filter(v => v.srcObject && !v.paused && v.offsetWidth > 0)
        .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];
      
      if (!sourceVideo || !sourceVideo.srcObject) {
        toast.error('No active video found');
        return;
      }

      await sourceVideo.requestPictureInPicture();
      setIsPiPMode(true);

      sourceVideo.addEventListener('leavepictureinpicture', () => {
        setIsPiPMode(false);
      }, { once: true });

    } catch (error) {
      console.error('Picture-in-Picture error:', error);
      toast.error('Picture-in-Picture failed');
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !call) return;
    
    const messageText = chatMessage.trim();
    setChatMessage('');
    
    try {
      const actualUserName = connectedUser?.name || userName || 'Guest';
      
      const localMessage = {
        id: Date.now().toString(),
        user: actualUserName,
        message: messageText,
        timestamp: new Date()
      };
      
      setChatMessages((prev) => [...prev, localMessage]);
      
      await call.sendCustomEvent({
        type: 'chat.message',
        user: actualUserName,
        message: messageText,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to send chat message:', error);
      toast.error('Message failed to send');
    }
  };

  const sendEmoji = (emoji: string) => {
    call?.sendCustomEvent({
      type: 'emoji.reaction',
      data: {
        emoji,
        user: connectedUser?.name || userName || 'Someone'
      }
    });
    setShowEmojiPicker(false);
    
    toast(
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span>Reaction sent!</span>
      </div>,
      { duration: 2000 }
    );
  };

  // Clear unread messages when chat is opened
  useEffect(() => {
    if (showChat) {
      setUnreadMessages(0);
    }
  }, [showChat]);

  // Listen for custom events
  useEffect(() => {
    if (!call) return;
    
    const handleCustomEvent = (event: any) => {
      // Handle chat messages
      const isDirectChatMessage = event?.type === 'chat.message';
      const isCustomChatMessage = event?.type === 'custom' && event?.custom?.type === 'chat.message';
      
      if (isDirectChatMessage || isCustomChatMessage) {
        const payload = isDirectChatMessage ? event : event.custom;
        
        const newMessage = {
          id: Date.now().toString() + Math.random(),
          user: payload?.user || event?.user?.name || 'Guest',
          message: payload?.message || '',
          timestamp: new Date(payload?.timestamp || Date.now())
        };
        
        if (newMessage.message && (!connectedUser || event?.user?.id !== connectedUser.id)) {
          setChatMessages((prev) => [...prev, newMessage]);
          // Increment unread count if chat is closed
          if (!showChat) {
            setUnreadMessages((prev) => prev + 1);
          }
        }
      }
      
      // Handle emoji reactions
      if (event.type === 'emoji.reaction') {
        toast(
          <div className="flex items-center gap-2">
            <span className="text-2xl">{event.data.emoji}</span>
            <span>{event.data.user} reacted</span>
          </div>,
          { duration: 3000 }
        );
      }
    };

    call.on('custom', handleCustomEvent);
    call.on('call.custom_event', handleCustomEvent);
    
    return () => {
      call.off('custom', handleCustomEvent);
      call.off('call.custom_event', handleCustomEvent);
    };
  }, [call, connectedUser, showChat]);

  // Handle recording state
  useEffect(() => {
    if (!call) return;
    
    const handleRecordingStarted = () => setIsRecording(true);
    const handleRecordingStopped = () => setIsRecording(false);
    
    call.on('call.recording_started', handleRecordingStarted);
    call.on('call.recording_stopped', handleRecordingStopped);
    
    return () => {
      call.off('call.recording_started', handleRecordingStarted);
      call.off('call.recording_stopped', handleRecordingStopped);
    };
  }, [call]);

  if (callingState === CallingState.OFFLINE || callingState === CallingState.IDLE) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-gray-400">Initializing video call...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (callingState === CallingState.JOINING) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-gray-400">Joining call...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-950 overflow-hidden">
      {/* Main container with chat sidebar */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 p-2 flex-shrink-0">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/impactlogotransparent.png" alt="AImpact" className="h-6 w-6" />
              <span className="font-semibold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AImpact Meeting
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">Room: {callId}</Badge>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                <Circle className="h-2 w-2 fill-red-500 mr-1" />
                Recording
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Layout Selector */}
            <Select value={layoutMode} onValueChange={(v: any) => setLayoutMode(v)}>
              <SelectTrigger className="w-[150px] h-8 text-sm bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    Grid View
                  </div>
                </SelectItem>
                <SelectItem value="speaker">
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4" />
                    Speaker View
                  </div>
                </SelectItem>
                <SelectItem value="sidebar">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    Sidebar View
                  </div>
                </SelectItem>
                <SelectItem value="spotlight">
                  <div className="flex items-center gap-2">
                    <Presentation className="h-4 w-4" />
                    Spotlight
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Action Buttons */}
            <Button
              size="sm"
              variant={isPiPMode ? "default" : "ghost"}
              onClick={togglePictureInPicture}
              className="h-8 w-8 p-0 hover:bg-white/10"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant={isFullscreen ? "default" : "ghost"}
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 hover:bg-white/10"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            
            <Button
              size="sm"
              variant={showChat ? "default" : "ghost"}
              onClick={() => setShowChat(!showChat)}
              className="h-8 w-8 p-0 hover:bg-white/10 relative"
            >
              <MessageSquare className="h-4 w-4" />
              {unreadMessages > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Button>
            
            <ParticipantCount />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInvite(true)}
              className="h-8 px-3 text-sm bg-white/5 border-white/10"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Invite
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={copyMeetingLink}
              className="h-8 px-3 text-sm bg-white/5 border-white/10"
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Video Area */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="h-full">
              {layoutMode === 'grid' && <PaginatedGridLayout />}
              {layoutMode === 'speaker' && <SpeakerLayout />}
              {layoutMode === 'sidebar' && (
                <div className="flex h-full gap-4">
                  <div className="flex-1 min-w-0">
                    <SpeakerLayout />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <CallParticipantsList onClose={() => {}} />
                  </div>
                </div>
              )}
              {layoutMode === 'spotlight' && <SpeakerLayout />}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="bg-black/40 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
          <CustomCallControls onDeviceSettings={() => setShowDeviceSettings(true)} />
        </div>
      </div>

      {/* Chat Sidebar - Full height */}
      {showChat && (
        <div className="w-96 border-l border-white/10 flex flex-col bg-black/20 backdrop-blur-xl h-full">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowChat(false)}
                className="h-6 w-6 hover:bg-white/10"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>{msg.user[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{msg.user}</span>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1 break-words whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="hover:bg-white/10"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border-white/10"
                />
                <Button
                  size="icon"
                  onClick={sendChatMessage}
                  className="bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {showEmojiPicker && (
                <div className="flex gap-2 mt-2 p-2 bg-white/5 rounded-lg">
                  {emojis.map((emoji) => (
                    <Button
                      key={emoji}
                      size="sm"
                      variant="ghost"
                      onClick={() => sendEmoji(emoji)}
                      className="hover:bg-white/10"
                    >
                      <span className="text-xl">{emoji}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteToCallModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        meetingLink={getMeetingLink()}
        roomId={callId}
        callType="Video Conference"
      />

      {/* Device Settings Modal */}
      <Dialog open={showDeviceSettings} onOpenChange={setShowDeviceSettings}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>Device Settings</DialogTitle>
            <DialogDescription>
              Configure your audio and video devices
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DeviceSettings />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main Component
export default function EnhancedVideoConferenceComplete({ roomId }: { roomId?: string }) {
  const { data: session, status } = useSession();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    let videoClient: StreamVideoClient | null = null;
    let callInstance: Call | null = null;

    const initializeVideo = async () => {
      try {
        if (status === 'loading') {
          console.log('Waiting for session...');
          return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const roomIdValue = roomId || urlParams.get('video') || `meeting-${Date.now()}`;
        const urlName = urlParams.get('name');

        let userId: string;
        let userNameValue: string;

        if (session?.user) {
          userId = session.user.id || session.user.email || `user-${Date.now()}`;
          // Prioritize profile.name over user.name over email
          const profileName = (session.user as any).profile?.name;
          userNameValue = profileName || session.user.name || 
            (session.user.email ? session.user.email.split('@')[0] : urlName || 'Guest');
        } else if (urlName) {
          userId = `guest-${urlName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
          userNameValue = urlName;
        } else {
          userId = `guest-${Date.now()}`;
          userNameValue = `Guest-${Date.now().toString().slice(-4)}`;
        }

        setUserName(userNameValue);
        console.log('Initializing video with:', { userId, userName: userNameValue, roomIdValue });

        // Get token
        const response = await fetch(`/api/stream-token?userId=${userId}&service=video`);
        if (!response.ok) {
          throw new Error('Failed to get token');
        }
        const { token } = await response.json();

        // Create or get existing client
        videoClient = await streamVideoManager.getOrCreateClient({
          apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
          user: { id: userId, name: userNameValue },
          token
        });

        if (!isMounted) return;

        setClient(videoClient);

        // Create and join call
        callInstance = videoClient.call('default', roomIdValue);
        await callInstance.getOrCreate();
        
        // iOS specific join parameters
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          await callInstance.join({ 
            create: false,
            ring: false 
          });
        } else {
          await callInstance.join();
        }

        if (!isMounted) return;

        setCall(callInstance);
        setLoading(false);

      } catch (error) {
        console.error('Failed to initialize video:', error);
        if (isMounted) {
          setLoading(false);
          toast.error('Failed to connect to video call');
        }
      }
    };

    initializeVideo();

    return () => {
      isMounted = false;
      const cleanup = async () => {
        try {
          if (callInstance) {
            await callInstance.leave();
          }
          if (videoClient) {
            await videoClient.disconnectUser();
          }
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      };
      cleanup();
    };
  }, [status, session, roomId]);

  if (loading || !client || !call) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-gray-400">Connecting to AImpact Video...</p>
              <p className="text-gray-500 text-sm mt-2">Setting up your conference room</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <StreamTheme>
          <div className="h-full flex flex-col">
            <VideoRoomComplete callId={call.id} userName={userName} />
          </div>
        </StreamTheme>
      </StreamCall>
    </StreamVideo>
  );
}