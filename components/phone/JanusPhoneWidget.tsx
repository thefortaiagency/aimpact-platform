'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useWebRTCPhone } from '@/hooks/use-webrtc-phone';
import { JANUS_CONFIG } from '@/lib/webrtc/janus-config';
import { phoneSounds } from '@/lib/utils/phone-sounds';
import { usePhoneIntegration } from '@/hooks/use-phone-integration';

interface JanusPhoneWidgetProps {
  className?: string;
}

export function JanusPhoneWidget({ className = '' }: JanusPhoneWidgetProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Integration with phone interface
  const phoneIntegration = usePhoneIntegration();

  const {
    callState,
    isConnected,
    isMuted,
    duration,
    error,
    initialize,
    makeCall,
    endCall,
    toggleMute,
    formatDuration
  } = useWebRTCPhone({ 
    janusServer: JANUS_CONFIG.server,
    getAudioElement: () => audioRef.current,
    onCallStateChange: (state) => {
      console.log('Call state changed:', state);
      
      // Play sounds based on state
      if (state === 'ringing') {
        phoneSounds.startRingtone('outgoing');
      } else if (state === 'active') {
        phoneSounds.stopRingtone();
        phoneSounds.playConnected();
        // Update active call status
        if (activeCallId) {
          phoneIntegration.updateActiveCall(activeCallId, { status: 'active' });
        }
      } else if (state === 'ended' || state === 'failed') {
        phoneSounds.stopRingtone();
        phoneSounds.playDisconnected();
        // Remove call from active calls
        if (activeCallId) {
          phoneIntegration.removeActiveCall(activeCallId);
          setActiveCallId(null);
        }
      } else if (state === 'connecting' && activeCallId) {
        phoneIntegration.updateActiveCall(activeCallId, { status: 'connecting' });
      } else if (state === 'ringing' && activeCallId) {
        phoneIntegration.updateActiveCall(activeCallId, { status: 'ringing' });
      }
    }
  });

  // Initialize Janus when needed
  const initializeIfNeeded = async () => {
    if (!isConnected && !isInitializing) {
      setIsInitializing(true);
      toast.info('Connecting to phone system...');
      
      try {
        await initialize();
        toast.success('Phone system connected');
      } catch (err) {
        toast.error('Failed to connect to phone system');
      } finally {
        setIsInitializing(false);
      }
    }
  };

  // Handle making a call
  const handleCall = async () => {
    console.log('handleCall triggered with phoneNumber:', phoneNumber);
    console.log('isConnected:', isConnected);
    console.log('callState:', callState);
    
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!isConnected) {
      toast.error('Phone system not connected. Please wait...');
      await initializeIfNeeded();
      return;
    }
    
    if (callState !== 'idle') {
      toast.error('Call already in progress');
      return;
    }

    // Format phone number for Telnyx SIP
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Add country code if needed
    if (!formattedNumber.startsWith('+')) {
      if (formattedNumber.length === 10) {
        formattedNumber = `+1${formattedNumber}`;
      } else if (formattedNumber.length === 11 && formattedNumber.startsWith('1')) {
        formattedNumber = `+${formattedNumber}`;
      }
    }

    console.log('Making call via Janus SIP to:', formattedNumber);
    
    // Add call to active calls tracking
    const callId = phoneIntegration.addActiveCall({
      phoneNumber: formattedNumber,
      direction: 'outbound',
      status: 'connecting',
      startTime: new Date(),
      duration: 0,
      isMuted: false
    });
    setActiveCallId(callId);
    
    try {
      const success = await makeCall(formattedNumber, false);
      if (success) {
        toast.success(`Calling ${formattedNumber}...`);
      } else {
        toast.error('Failed to initiate call - check console for details');
        // Remove the call if it failed
        phoneIntegration.removeActiveCall(callId);
        setActiveCallId(null);
      }
    } catch (error) {
      console.error('Call failed with error:', error);
      toast.error('Call failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      phoneIntegration.removeActiveCall(callId);
      setActiveCallId(null);
    }
  };

  // Handle ending a call
  const handleEndCall = () => {
    endCall();
    setPhoneNumber('');
    toast.info('Call ended');
  };
  
  // Update call duration in active calls
  useEffect(() => {
    if (activeCallId && callState === 'active') {
      const interval = setInterval(() => {
        phoneIntegration.updateActiveCall(activeCallId, { duration: duration });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCallId, callState, duration, phoneIntegration]);


  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Handle calls initiated from phone interface
  useEffect(() => {
    console.log('[JanusWidget] useEffect triggered:', {
      shouldInitiateCall: phoneIntegration.shouldInitiateCall,
      phoneNumber: phoneIntegration.phoneNumber,
      isConnected
    });
    
    const initiateCallFromInterface = async () => {
      if (phoneIntegration.shouldInitiateCall && phoneIntegration.phoneNumber) {
        console.log('[JanusWidget] Phone integration triggered call:', phoneIntegration.phoneNumber);
        setPhoneNumber(phoneIntegration.phoneNumber);
        
        // First ensure we're connected
        if (!isConnected && !isInitializing) {
          console.log('[JanusWidget] Not connected, initializing first...');
          setIsInitializing(true);
          toast.info('Connecting to phone system...');
          
          try {
            await initialize();
            toast.success('Phone system connected');
            console.log('[JanusWidget] Successfully initialized, now making call');
            
            // Wait a moment for state to settle
            setTimeout(() => {
              handleCall();
            }, 500);
          } catch (err) {
            console.error('[JanusWidget] Failed to initialize:', err);
            toast.error('Failed to connect to phone system');
          } finally {
            setIsInitializing(false);
          }
        } else if (isConnected) {
          console.log('[JanusWidget] Already connected, initiating call directly');
          // Small delay to ensure state is ready
          setTimeout(() => {
            handleCall();
          }, 100);
        }
        
        phoneIntegration.resetCall();
      }
    };
    
    initiateCallFromInterface();
  }, [phoneIntegration.shouldInitiateCall, phoneIntegration.phoneNumber]);
  
  // Handle end call requests from phone interface
  useEffect(() => {
    if (phoneIntegration.callToEnd === activeCallId && activeCallId) {
      handleEndCall();
      phoneIntegration.clearEndCallRequest();
    }
  }, [phoneIntegration.callToEnd, activeCallId]);

  return (
    <>
      {/* Hidden audio element for call audio - this is all we need! */}
      <audio ref={audioRef} className="hidden" />
    </>
  );
}