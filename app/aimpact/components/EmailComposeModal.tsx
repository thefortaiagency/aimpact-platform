'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  Loader2, 
  AlertCircle, 
  X, 
  Minimize2, 
  Maximize2,
  Paperclip,
  Link,
  EmojiSmile,
  Image,
  Lock,
  Clock,
  MoreVertical,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailComposeModalProps {
  isOpen: boolean
  onClose: () => void
  onEmailSent?: () => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
}

interface ComposeData {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
}

export function EmailComposeModal({
  isOpen,
  onClose,
  onEmailSent,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = ''
}: EmailComposeModalProps) {
  console.log('[EmailComposeModal] Rendered with isOpen:', isOpen)
  
  // Load saved draft from localStorage
  const loadDraft = () => {
    const savedDraft = localStorage.getItem('emailDraft')
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft)
      } catch {
        return null
      }
    }
    return null
  }
  
  const [composeData, setComposeData] = useState<ComposeData>(() => {
    const draft = loadDraft()
    return draft || {
      to: defaultTo,
      cc: '',
      bcc: '',
      subject: defaultSubject,
      body: defaultBody
    }
  })

  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  // Auto-save draft every 10 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (composeData.to || composeData.subject || composeData.body) {
        localStorage.setItem('emailDraft', JSON.stringify(composeData))
        setLastSaved(new Date())
      }
    }, 10000)
    
    return () => clearInterval(saveInterval)
  }, [composeData])

  // Simple validation
  const isValid = () => {
    return composeData.to.trim() !== ''
  }

  const handleSend = async () => {
    console.log('[EmailComposeModal] handleSend clicked!')
    console.log('[EmailComposeModal] Current data:', composeData)
    
    // Clear previous messages
    setErrorMessage('')
    setSuccessMessage('')

    // Validate
    if (!composeData.to.trim()) {
      setErrorMessage('Please specify at least one recipient.')
      return
    }

    setIsSending(true)

    try {
      console.log('[EmailCompose] Sending email...')
      
      const response = await fetch('/api/aimpact/gmail/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: composeData.to,
          cc: composeData.cc,
          bcc: composeData.bcc,
          subject: composeData.subject || '(no subject)',
          body: composeData.body
        })
      })

      console.log('[EmailCompose] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[EmailCompose] Error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('[EmailCompose] Success:', result)

      // Success!
      setSuccessMessage('Message sent')
      toast.success('Message sent')
      
      // Clear draft from localStorage
      localStorage.removeItem('emailDraft')

      // Close modal after short delay
      setTimeout(() => {
        onClose()
        onEmailSent?.()
        // Reset form
        setComposeData({
          to: '',
          cc: '',
          bcc: '',
          subject: '',
          body: ''
        })
        setSuccessMessage('')
        setErrorMessage('')
      }, 1500)

    } catch (error: any) {
      console.error('[EmailCompose] Send failed:', error)
      const message = error.message || 'Failed to send email. Please try again.'
      setErrorMessage(message)
      toast.error('Failed to send', {
        description: message
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      onClose()
      setErrorMessage('')
      setSuccessMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send with Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isValid()) {
      handleSend()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[600px] bg-white dark:bg-[#1e1e1e] border-0 shadow-2xl p-0 rounded-lg overflow-hidden">
        {/* Gmail-style header */}
        <DialogHeader className="bg-[#404040] dark:bg-[#2b2b2b] text-white px-4 py-2 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-normal text-[#e8eaed]">
            New Message
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#e8eaed] hover:bg-[#5f6368] rounded"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#e8eaed] hover:bg-[#5f6368] rounded"
              onClick={() => {}}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#e8eaed] hover:bg-[#5f6368] rounded"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[calc(100%-3rem)]">
          {/* Recipients section */}
          <div className="border-b border-[#e0e0e0] dark:border-[#5f6368]">
            {/* To field */}
            <div className="flex items-center px-4 py-2 hover:shadow-sm">
              <span className="text-[#5f6368] dark:text-[#9aa0a6] text-sm w-12">To</span>
              <div className="flex-1 flex items-center">
                <input
                  type="text"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                  placeholder="Recipients"
                  disabled={isSending}
                />
                <button
                  className="text-[#5f6368] dark:text-[#9aa0a6] text-sm px-2 hover:text-[#202124] dark:hover:text-[#e8eaed]"
                  onClick={() => setShowCc(!showCc)}
                >
                  Cc
                </button>
                <button
                  className="text-[#5f6368] dark:text-[#9aa0a6] text-sm px-2 hover:text-[#202124] dark:hover:text-[#e8eaed]"
                  onClick={() => setShowBcc(!showBcc)}
                >
                  Bcc
                </button>
              </div>
            </div>

            {/* Cc field */}
            {showCc && (
              <div className="flex items-center px-4 py-2 hover:shadow-sm">
                <span className="text-[#5f6368] dark:text-[#9aa0a6] text-sm w-12">Cc</span>
                <input
                  type="text"
                  value={composeData.cc}
                  onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                  placeholder="Cc recipients"
                  disabled={isSending}
                />
              </div>
            )}

            {/* Bcc field */}
            {showBcc && (
              <div className="flex items-center px-4 py-2 hover:shadow-sm">
                <span className="text-[#5f6368] dark:text-[#9aa0a6] text-sm w-12">Bcc</span>
                <input
                  type="text"
                  value={composeData.bcc}
                  onChange={(e) => setComposeData({ ...composeData, bcc: e.target.value })}
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                  placeholder="Bcc recipients"
                  disabled={isSending}
                />
              </div>
            )}

            {/* Subject field */}
            <div className="flex items-center px-4 py-2 hover:shadow-sm">
              <input
                type="text"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                placeholder="Subject"
                disabled={isSending}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Message body */}
          <div className="flex-1 px-4 py-3">
            <textarea
              value={composeData.body}
              onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
              className="w-full h-full bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368] resize-none"
              placeholder="Compose email"
              disabled={isSending}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="px-4 pb-2">
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="px-4 pb-2">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 py-2">
                <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                  {successMessage}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="border-t border-[#e0e0e0] dark:border-[#5f6368] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={!isValid() || isSending}
                  className="bg-[#1a73e8] hover:bg-[#1765cc] text-white px-6 py-1.5 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send'
                  )}
                </Button>

                {/* Formatting options */}
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <span className="text-base font-serif">A</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <EmojiSmile className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {lastSaved && (
                  <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mr-2">
                    Draft saved
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  onClick={handleClose}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}