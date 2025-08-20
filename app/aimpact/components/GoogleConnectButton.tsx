'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'

interface GoogleConnectButtonProps {
  text?: string
  className?: string
  onSuccess?: () => void
}

export default function GoogleConnectButton({ 
  text = "Connect Google Account",
  className = "",
  onSuccess
}: GoogleConnectButtonProps) {
  
  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn('google', {
        callbackUrl: window.location.href,
        redirect: true
      })
      
      if (result?.ok && onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  return (
    <Button
      onClick={handleGoogleSignIn}
      variant="outline"
      className={`flex items-center gap-2 ${className}`}
    >
      <FcGoogle className="h-5 w-5" />
      {text}
    </Button>
  )
}