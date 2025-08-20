'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useJanus } from '@/hooks/useJanus';

interface TelnyxPhoneProps {
  telnyxNumber?: string;
  className?: string;
}

export const TelnyxPhone: React.FC<TelnyxPhoneProps> = ({
  telnyxNumber = '+12602794654',
  className = ''
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    isInitialized,
    isConnected,
    callStatus,
    error,
    connect,
    makeCall,
    hangup,
    setRemoteAudioRef
  } = useJanus({
    server: process.env.NEXT_PUBLIC_JANUS_SERVER || 'https://webrtc.aimpactnexus.ai:8089/janus',
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: `stun:${process.env.NEXT_PUBLIC_STUN_SERVER || '157.245.217.152:3478'}` },
      {
        urls: `turn:${process.env.NEXT_PUBLIC_STUN_SERVER || '157.245.217.152:3478'}`,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || "janus",
        credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || "janusturnpwd"
      }
    ],
    telnyxNumber: process.env.NEXT_PUBLIC_TELNYX_NUMBER || telnyxNumber,
    telnyxDomain: 'sip.telnyx.com'
  });

  useEffect(() => {
    if (audioRef.current) {
      setRemoteAudioRef(audioRef.current);
    }
  }, [setRemoteAudioRef]);

  const handleCall = () => {
    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }

    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      alert('Please enter a valid phone number');
      return;
    }

    if (!isConnected) {
      connect();
    } else {
      makeCall(phoneNumber);
    }
  };

  // Auto-connect when initialized
  useEffect(() => {
    if (isInitialized && !isConnected && callStatus === 'idle') {
      connect();
    }
  }, [isInitialized, isConnected, callStatus, connect]);

  // Auto-call when connected (if was trying to call)
  useEffect(() => {
    if (isConnected && callStatus === 'idle' && phoneNumber) {
      makeCall(phoneNumber);
    }
  }, [isConnected, callStatus, phoneNumber, makeCall]);

  const getStatusMessage = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Ringing...';
      case 'connected': return 'Call connected';
      default: return isConnected ? 'Ready to call' : 'Initializing...';
    }
  };

  const getStatusIcon = () => {
    switch (callStatus) {
      case 'connecting': return '🔄';
      case 'ringing': return '🔔';
      case 'connected': return '📞';
      default: return isConnected ? '✅' : '🔌';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Glass morphism card */}
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-magenta-500/10 pointer-events-none" />
        
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-magenta-500 rounded-3xl blur-xl opacity-20 animate-pulse" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Status indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-magenta-400 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 flex items-center gap-3">
                <span className="text-2xl">{getStatusIcon()}</span>
                <span className="text-white font-medium">{getStatusMessage()}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-200 px-4 py-3 rounded-xl mb-6 text-center">
              {error}
            </div>
          )}

          {/* Phone input */}
          <div className="space-y-6">
            <div className="relative group">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/20 transition-all duration-300 text-center text-lg font-medium"
                disabled={callStatus !== 'idle'}
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Call button */}
            {callStatus === 'idle' ? (
              <button
                onClick={handleCall}
                disabled={!isInitialized}
                className="relative w-full group overflow-hidden rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-magenta-500 animate-gradient-x" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-magenta-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-black/20 backdrop-blur-sm px-6 py-4 flex items-center justify-center gap-3">
                  <span className="text-2xl">📞</span>
                  <span className="text-white font-bold text-lg">
                    {isInitialized ? 'Start Call' : 'Initializing...'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={hangup}
                className="relative w-full group overflow-hidden rounded-2xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-black/20 backdrop-blur-sm px-6 py-4 flex items-center justify-center gap-3">
                  <span className="text-2xl">📞</span>
                  <span className="text-white font-bold text-lg">End Call</span>
                </div>
              </button>
            )}
          </div>

          {/* Call quality indicators */}
          {callStatus === 'connected' && (
            <div className="mt-6 flex justify-center gap-2">
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-full px-3 py-1">
                <span className="text-green-300 text-xs font-medium">HD Audio</span>
              </div>
              <div className="bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30 rounded-full px-3 py-1">
                <span className="text-cyan-300 text-xs font-medium">Encrypted</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} autoPlay className="hidden" />
      
      {/* Additional styles for gradient animation */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
};