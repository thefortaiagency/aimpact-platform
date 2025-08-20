'use client';

import { useState, useEffect } from 'react';
import { Phone, PhoneMissed, PhoneCall, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FloatingWindow from './FloatingWindow';
import { SimplePhoneInterface } from '@/components/simple-phone-interface';

interface FloatingPhoneProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhoneNumber?: string;
  contactName?: string;
}

export default function FloatingPhone({ isOpen, onClose, initialPhoneNumber, contactName }: FloatingPhoneProps) {
  const [phoneElement, setPhoneElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Get the persistent phone container and move it to this window
      const persistentPhone = document.getElementById('persistent-phone-container');
      if (persistentPhone) {
        persistentPhone.classList.remove('hidden');
        setPhoneElement(persistentPhone);
      }
    } else {
      // Hide the phone when window closes
      const persistentPhone = document.getElementById('persistent-phone-container');
      if (persistentPhone) {
        persistentPhone.classList.add('hidden');
      }
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <FloatingWindow
      title={contactName ? `Call ${contactName}` : "Quick Call"}
      icon={<Phone className="h-4 w-4 text-green-500" />}
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 420 : 100, y: 80 }}
      defaultSize={{ width: 380, height: 600 }}
      minWidth={320}
      minHeight={500}
      maxWidth={500}
      maxHeight={700}
    >
      <div className="h-full" ref={(el) => {
        // Move the persistent phone element into this container
        if (el && phoneElement) {
          el.appendChild(phoneElement);
        }
      }} />
    </FloatingWindow>
  );
}