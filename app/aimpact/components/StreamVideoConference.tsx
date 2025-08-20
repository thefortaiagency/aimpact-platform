'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  useCallStateHooks,
  ParticipantView,
  SpeakerLayout,
  CallControls,
  CallParticipantsList,
  useCall,
  CallingState,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, Phone, PhoneOff, Mic, MicOff, Monitor, Users, Copy, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom UI Components for Stream
const CustomCallControls = () => {
  const call = useCall();
  const { useMicrophoneState, useCameraState, useScreenShareState } = useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState();
  const { camera, isCameraOn } = useCameraState();
  const { screenShare, isScreenSharing } = useScreenShareState();

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-black/20 backdrop-blur-md rounded-lg">
      <Button
        variant={isMute ? "destructive" : "secondary"}
        size="icon"
        onClick={() => microphone.toggle()}
        className="h-12 w-12"
      >
        {isMute ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      
      <Button
        variant={!isCameraOn ? "destructive" : "secondary"}
        size="icon"
        onClick={() => camera.toggle()}
        className="h-12 w-12"
      >
        {!isCameraOn ? <Video className="h-5 w-5 line-through" /> : <Video className="h-5 w-5" />}
      </Button>
      
      <Button
        variant={isScreenSharing ? "default" : "secondary"}
        size="icon"
        onClick={() => screenShare.toggle()}
        className="h-12 w-12"
      >
        <Monitor className="h-5 w-5" />
      </Button>
      
      <Button
        variant="destructive"
        size="icon"
        onClick={() => call?.leave()}
        className="h-12 w-12"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
};

const VideoRoom = ({ callId }: { callId: string }) => {
  const call = useCall();
  const { useCallCallingState, useParticipants, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const [copied, setCopied] = useState(false);

  const getMeetingLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/aimpact?video=${callId}`;
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(getMeetingLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (callingState === CallingState.JOINING) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Joining video conference...</p>
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
            <p className="text-muted-foreground">You have left the video conference.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-black/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <span className="font-semibold">AImpact Video Conference</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
                Copy Meeting Link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        <SpeakerLayout participantsBarPosition="bottom" />
      </div>

      {/* Controls */}
      <div className="p-4 border-t bg-black/10 backdrop-blur-sm">
        <CustomCallControls />
      </div>
    </div>
  );
};

export default function StreamVideoConference() {
  const { data: session } = useSession();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [callId, setCallId] = useState('');
  const [call, setCall] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize Stream client
  useEffect(() => {
    if (!session?.user) return;

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    if (!apiKey) {
      setError('Stream.io API key not configured');
      return;
    }

    const userId = session.user.id || session.user.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'user';
    const userName = session.user.name || session.user.email?.split('@')[0] || 'Guest';

    // Create token for authentication (in production, generate this server-side)
    const token = 'development_token'; // This should be generated server-side in production

    try {
      const streamClient = new StreamVideoClient({
        apiKey,
        user: {
          id: userId,
          name: userName,
          image: session.user.image || undefined,
        },
        tokenProvider: async () => {
          // Get token from API - using GET method like in working aether implementation
          const response = await fetch(`/api/stream-token?userId=${userId}&service=video`);
          const data = await response.json();
          return data.token;
        },
      });

      setClient(streamClient);
    } catch (err) {
      console.error('Failed to initialize Stream client:', err);
      setError('Failed to initialize video client');
    }

    return () => {
      client?.disconnectUser();
    };
  }, [session]);

  // Check for video call ID in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoParam = urlParams.get('video');
    if (videoParam && client) {
      setCallId(videoParam);
      joinCall(videoParam);
    }
  }, [client]);

  const createCall = async () => {
    if (!client || !callId) {
      setError('Please enter a meeting ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newCall = client.call('default', callId);
      await newCall.join({ create: true });
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
      setError('Failed to join video call. Make sure the meeting ID is correct.');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomId = () => {
    const randomId = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCallId(randomId);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">Please sign in to use video conferencing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Initializing video system...</p>
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
                Video Conference
              </CardTitle>
              <CardDescription>
                Start or join a video meeting with your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting ID</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter meeting ID or generate one"
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
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4 mr-2" />
                  )}
                  Join Meeting
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Share the meeting ID with participants to invite them</p>
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