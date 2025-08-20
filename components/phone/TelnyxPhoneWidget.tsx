'use client';

import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Hash, X, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TelnyxCall {
  callId: string;
  callLegId: string;
  status: string;
  to: string;
  from: string;
  startTime: number;
  duration: number;
}

interface TelnyxPhoneWidgetProps {
  className?: string;
}

export function TelnyxPhoneWidget({ className = '' }: TelnyxPhoneWidgetProps) {
  const [showDialpad, setShowDialpad] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeCall, setActiveCall] = useState<TelnyxCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const durationInterval = React.useRef<NodeJS.Timeout | null>(null);

  // Update call duration
  useEffect(() => {
    if (activeCall && activeCall.status === 'answered') {
      durationInterval.current = setInterval(() => {
        const duration = Math.floor((Date.now() - activeCall.startTime) / 1000);
        setCallDuration(duration);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [activeCall]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle making a call
  const handleCall = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsConnecting(true);
    console.log('Making Telnyx call to:', phoneNumber);

    try {
      const response = await fetch('/api/aimpact/phone/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          action: 'call'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to initiate call');
      }

      // Create call object
      const newCall: TelnyxCall = {
        callId: data.callId,
        callLegId: data.callLegId,
        status: data.status,
        to: data.to,
        from: data.from,
        startTime: Date.now(),
        duration: 0
      };

      setActiveCall(newCall);
      setShowDialpad(false);
      toast.success(`Call initiated to ${phoneNumber}`);
      
      // For demo purposes, simulate call being answered after 3 seconds
      setTimeout(() => {
        setActiveCall(prev => prev ? { ...prev, status: 'answered' } : null);
      }, 3000);
    } catch (error) {
      console.error('Call error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to make call');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle ending a call
  const handleEndCall = async () => {
    if (!activeCall) return;

    try {
      const response = await fetch('/api/aimpact/phone/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeCall.to,
          callId: activeCall.callId,
          action: 'hangup'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end call');
      }

      toast.success('Call ended');
      setActiveCall(null);
      setPhoneNumber('');
    } catch (error) {
      console.error('Hangup error:', error);
      toast.error('Failed to end call');
    }
  };

  // Handle digit press
  const handleDigitPress = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  // Handle keypad input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleCall();
    } else if (e.key === 'Backspace') {
      setPhoneNumber(prev => prev.slice(0, -1));
    } else if (/^[0-9+*#]$/.test(e.key)) {
      handleDigitPress(e.key);
    }
  };

  // Toggle mute (UI only for now)
  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? 'Unmuted' : 'Muted');
  };

  const isCallActive = activeCall !== null;

  return (
    <>
      {/* Floating Phone Button/Active Call Widget */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {isCallActive ? (
          // Active Call Widget
          <Card className="p-4 bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl border-purple-500/30 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-white font-medium">
                  {activeCall.status === 'initiated' && 'Calling...'}
                  {activeCall.status === 'ringing' && 'Ringing...'}
                  {activeCall.status === 'answered' && activeCall.to}
                </p>
                {activeCall.status === 'answered' && (
                  <p className="text-xs text-gray-300">{formatDuration(callDuration)}</p>
                )}
              </div>
              
              <div className="flex gap-2">
                {activeCall.status === 'answered' && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={toggleMute}
                    className={`rounded-full ${
                      isMuted ? 'bg-red-500/20 border-red-500' : 'bg-white/10 border-white/30'
                    }`}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={handleEndCall}
                  className="rounded-full"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          // Phone Button
          <Button
            onClick={() => setShowDialpad(true)}
            className="rounded-full w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
          >
            <Phone className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Dialpad Dialog */}
      <Dialog open={showDialpad} onOpenChange={setShowDialpad}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center justify-between">
              Telnyx Phone
              <Badge variant="default" className="bg-green-600">
                Ready
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Number Display */}
            <div className="bg-black/30 rounded-lg p-4">
              <Input
                type="tel"
                placeholder="Enter number..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={handleKeyPress}
                className="text-2xl text-center bg-transparent border-0 text-white placeholder:text-gray-500"
                autoFocus
                disabled={isConnecting}
              />
            </div>

            {/* Dialpad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  size="lg"
                  onClick={() => handleDigitPress(digit)}
                  disabled={isConnecting}
                  className="h-16 text-xl font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  {digit}
                </Button>
              ))}
            </div>

            {/* Call Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleCall}
                disabled={!phoneNumber || isConnecting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </>
                )}
              </Button>

              {/* Clear Button */}
              <Button
                variant="outline"
                onClick={() => setPhoneNumber('')}
                disabled={isConnecting}
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Clear
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-white/20">
              <p className="text-sm text-gray-300 mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPhoneNumber('+12602794654')}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Test Number
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDialpad(false);
                    toast.info('SMS feature coming soon!');
                  }}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  SMS
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}