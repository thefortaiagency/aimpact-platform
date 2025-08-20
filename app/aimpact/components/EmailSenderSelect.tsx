'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Mail, ChevronDown, Plus, X, Check, Building2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EmailAlias {
  email: string
  name: string
  domain: string
  isDefault?: boolean
  isShared?: boolean
  verified?: boolean
}

interface EmailSenderSelectProps {
  value?: string
  onChange?: (email: string) => void
  className?: string
  label?: string
  required?: boolean
}

export default function EmailSenderSelect({ 
  value, 
  onChange, 
  className = '', 
  label = 'Send From',
  required = false 
}: EmailSenderSelectProps) {
  const { data: session } = useSession()
  const [emailAliases, setEmailAliases] = useState<EmailAlias[]>([])
  const [selectedEmail, setSelectedEmail] = useState(value || '')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newAlias, setNewAlias] = useState({ email: '', name: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [userPreferences, setUserPreferences] = useState<any>(null)

  // Set up default email aliases based on user
  useEffect(() => {
    if (session?.user?.email) {
      // Create default aliases based on known domains
      const defaultAliases: EmailAlias[] = [
        {
          email: 'contact@thefortaiagency.com',
          name: 'The Fort AI Agency',
          domain: 'thefortaiagency.com',
          isDefault: true,
          verified: true,
          isShared: true
        },
        {
          email: 'support@thefortaiagency.com',
          name: 'Support Team',
          domain: 'thefortaiagency.com',
          verified: true,
          isShared: true
        },
        {
          email: 'hello@thefortaiagency.com',
          name: 'Hello Team',
          domain: 'thefortaiagency.com',
          verified: true,
          isShared: true
        }
      ]
      
      // Add aoberlin@aimpactnexus.ai as the first/default option
      defaultAliases.unshift({
        email: 'aoberlin@aimpactnexus.ai',
        name: 'Andrew Oberlin',
        domain: 'aimpactnexus.ai',
        verified: true,
        isShared: false
      })
      
      // Add user's personal email if it's from a verified domain and not already added
      if ((session.user.email.includes('@thefortaiagency.com') || 
          session.user.email.includes('@aimpactnexus.ai')) &&
          session.user.email !== 'aoberlin@aimpactnexus.ai') {
        defaultAliases.unshift({
          email: session.user.email,
          name: session.user.name || session.user.email.split('@')[0],
          domain: session.user.email.split('@')[1],
          verified: true,
          isShared: false
        })
      }
      
      setEmailAliases(defaultAliases)
      
      // Set default selection if nothing is selected yet
      const defaultEmail = 'aoberlin@aimpactnexus.ai' // Always use this as default
      if (!selectedEmail) {
        console.log('[EmailSenderSelect] Setting default email to:', defaultEmail)
        setSelectedEmail(defaultEmail)
      }
      
      // Always notify parent of the default on first load
      if (onChange && !selectedEmail) {
        console.log('[EmailSenderSelect] Notifying parent of default:', defaultEmail)
        setTimeout(() => onChange(defaultEmail), 0) // Use setTimeout to avoid React state update warning
      }
    }
  }, [session?.user?.email]) // Only depend on session email to avoid circular deps
  
  // Update internal state when value prop changes
  useEffect(() => {
    if (value && value !== selectedEmail) {
      console.log('[EmailSenderSelect] Value prop changed to:', value)
      setSelectedEmail(value)
    }
  }, [value])
  
  // Removed this useEffect to prevent circular updates
  // onChange is now only called through handleSelect

  const handleAddAlias = () => {
    if (!newAlias.email) return
    
    // Add the alias locally (no API call)
    const domain = newAlias.email.split('@')[1]
    const newEmailAlias: EmailAlias = {
      email: newAlias.email,
      name: newAlias.name || newAlias.email.split('@')[0],
      domain: domain,
      verified: false,
      isShared: false
    }
    
    setEmailAliases([...emailAliases, newEmailAlias])
    setNewAlias({ email: '', name: '' })
    setShowAddDialog(false)
  }

  const handleRemoveAlias = (email: string) => {
    // Remove locally (no API call)
    setEmailAliases(emailAliases.filter(a => a.email !== email))
    if (selectedEmail === email && emailAliases.length > 1) {
      const newSelection = emailAliases.find(a => a.email !== email)?.email || ''
      setSelectedEmail(newSelection)
      onChange?.(newSelection)
    }
  }

  const handleSelect = (email: string) => {
    console.log('[EmailSenderSelect] User selected:', email)
    setSelectedEmail(email)
    onChange?.(email)
  }
  
  const handleSetAsDefault = (email: string) => {
    // Update locally (no API call)
    setUserPreferences({ ...userPreferences, defaultSenderEmail: email })
    
    // Update aliases to reflect new default
    setEmailAliases(emailAliases.map(a => ({
      ...a,
      isDefault: a.email === email
    })))
  }

  const selectedAlias = emailAliases.find(a => a.email === selectedEmail)

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={`w-full justify-between ${className}`}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {selectedAlias ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedAlias.name || selectedAlias.email.split('@')[0]}</span>
                  <span className="text-muted-foreground text-sm">({selectedAlias.email})</span>
                  {selectedAlias.isShared && (
                    <Badge variant="secondary" className="text-xs">Shared</Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Select sender email...</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-[400px]">
          <DropdownMenuLabel>Email Addresses</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Personal Emails */}
          {emailAliases.filter(a => !a.isShared).length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Personal</DropdownMenuLabel>
              {emailAliases.filter(a => !a.isShared).map((alias) => (
                <DropdownMenuItem
                  key={alias.email}
                  onClick={() => handleSelect(alias.email)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {selectedEmail === alias.email && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">{alias.name || alias.email.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground">{alias.email}</p>
                    </div>
                  </div>
                  {alias.verified && (
                    <Badge variant="outline" className="text-xs">Verified</Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {/* Shared/Team Emails */}
          {emailAliases.filter(a => a.isShared).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Team/Shared</DropdownMenuLabel>
              {emailAliases.filter(a => a.isShared).map((alias) => (
                <DropdownMenuItem
                  key={alias.email}
                  onClick={() => handleSelect(alias.email)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {selectedEmail === alias.email && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{alias.name}</p>
                      <p className="text-xs text-muted-foreground">{alias.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Shared</Badge>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Email Address
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Add Email Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email Address</DialogTitle>
            <DialogDescription>
              Add a new email address to send from. Make sure you have access to this email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@domain.com"
                value={newAlias.email}
                onChange={(e) => setNewAlias({ ...newAlias, email: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Display Name (optional)</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newAlias.name}
                onChange={(e) => setNewAlias({ ...newAlias, name: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAlias} disabled={!newAlias.email || isLoading}>
              {isLoading ? 'Adding...' : 'Add Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}