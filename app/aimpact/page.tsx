'use client'

import './styles.css'
import '@/lib/debug-utils' // Debug utility to catch contact errors
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// import { useSession, signOut } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { Phone, Mail, Users, MessageSquare, Clock, BarChart3, Brain, Settings, Bell, Ticket, Menu, X, Video, Headphones, Home, FileText, Briefcase, Send, ChevronLeft, ChevronRight, User, LogOut, MessageCircle, Calendar, CheckSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import CRMInterface from './components/CRMInterface'
import WorkingGmailInterface from './components/WorkingGmailInterface'
// import PhoneInterfaceWebRTC from './components/PhoneInterfaceWebRTC' // Commented out to prevent automatic mic permissions
import UnifiedInbox from './components/UnifiedInbox'
import InsightsDashboard from './components/InsightsDashboard'
import TicketingSystem from './components/TicketingSystem'
import MobileFixes from './components/MobileFixes'
import CompanyMessaging from './components/CompanyMessaging'
// import ImpactChatbot from './components/ImpactChatbot' // Removed - will be replaced with internal AI chatbot
import MeetingHub from './components/MeetingHub'
import StreamMessaging from './components/StreamMessaging'
import RemoteSupport from './components/RemoteSupport'
import ProjectsList from './components/ProjectsList'
import ProjectDetail from './components/ProjectDetail'
import { ResizableAgenticChatbot } from './components/ResizableAgenticChatbot'
import Quotes from './components/Quotes'
import EmailCampaigns from './components/EmailCampaigns'
import ComprehensiveToDo from './components/ComprehensiveToDo'
import { EmbeddedSoftphone } from '@/components/embedded-softphone'
import { SimplePhoneInterface } from '@/components/simple-phone-interface'
import PhoneSystemComplete from './components/PhoneSystemComplete'
import FloatingPhone from './components/FloatingPhone'
import FloatingSMSRedesigned from './components/FloatingSMSRedesigned'
import FloatingEmail from './components/FloatingEmail'
import { PersistentPhoneService } from '@/components/PersistentPhoneService'
// import { JanusPhoneWidget } from '@/components/phone/JanusPhoneWidget' // Commented out to prevent automatic mic permissions

export default function ImpactPage() {
  const router = useRouter()
  // const { data: session, status } = useSession()
  const session = { user: { email: 'user@example.com' } } // Mock session for build
  const status = 'authenticated'
  
  // Redirect to login if not authenticated
  // useEffect(() => {
  //   if (status === 'loading') return
  //   if (!session) {
  //     router.push('/login')
  //   }
  // }, [session, status, router])
  const [activeTab, setActiveTab] = useState('crm') // Start with CRM as it's the beginning of the workflow
  const [notifications] = useState(0) // Real notification count - starts at 0
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Starts closed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // Sidebar collapse state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null) // Track selected project
  const [chatbotCollapsed, setChatbotCollapsed] = useState(true) // Start with chatbot collapsed
  const [chatbotWidth, setChatbotWidth] = useState(480) // Default chat width
  const [quotesRefreshTrigger, setQuotesRefreshTrigger] = useState(0) // Trigger quotes refresh
  const [showFloatingPhone, setShowFloatingPhone] = useState(false) // Floating phone window
  const [floatingPhoneData, setFloatingPhoneData] = useState<{ phoneNumber?: string; contactName?: string }>({})
  const [showFloatingSMS, setShowFloatingSMS] = useState(false) // Floating SMS window
  const [floatingSMSData, setFloatingSMSData] = useState<{ phoneNumber?: string; message?: string; contactName?: string }>({})
  const [showFloatingEmail, setShowFloatingEmail] = useState(false) // Floating email window

  // Listen for incoming calls and auto-open FloatingPhone
  useEffect(() => {
    const handleIncomingCall = (event: CustomEvent) => {
      console.log('Incoming call detected:', event.detail);
      
      // Auto-open the FloatingPhone window
      setShowFloatingPhone(true);
      
      // Play a ringtone sound (optional)
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.play().catch(e => console.log('Could not play ringtone:', e));
    };

    window.addEventListener('incoming-call', handleIncomingCall as EventListener);
    
    return () => {
      window.removeEventListener('incoming-call', handleIncomingCall as EventListener);
    };
  }, []);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If no session, component will redirect (handled in useEffect)
  if (!session) {
    return null
  }

  const sidebarItems = [
    { id: 'crm', label: 'CRM', icon: Users, badge: 0 },
    { id: 'campaigns', label: 'Email Campaigns', icon: Send, badge: 0 },
    { id: 'meetings', label: 'Meetings', icon: Calendar, badge: 0 },
    { id: 'quotes', label: 'Quotes', icon: FileText, badge: 0 },
    { id: 'projects', label: 'Projects', icon: Briefcase, badge: 0 },
    { id: 'tickets', label: 'Tickets', icon: Ticket, badge: 0 },
    { id: 'todo', label: 'To Do', icon: CheckSquare, badge: 0 },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare, badge: 0 },
    { id: 'email', label: 'Email', icon: Mail, badge: 0 },
    { id: 'phone', label: 'Phone', icon: Phone, badge: 0 },
    { id: 'remote', label: 'Remote Support', icon: Headphones, badge: 0 },
    { id: 'insights', label: 'AI Insights', icon: Brain, badge: 0 }
  ]

  return (
    <div className="aimpact-container bg-background relative">
      {/* Background Image - Fixed positioning with performance optimizations */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img 
          src="/aethermeetingroom.png" 
          alt="Background" 
          className="w-full h-full object-cover opacity-70"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-background/40"></div>
      </div>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => {
              console.log('Overlay clicked')
              setMobileMenuOpen(false)
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Modern Sidebar */}
      <div 
        className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 ${sidebarCollapsed ? 'w-16' : 'w-64'} border-r bg-background/95 z-50 lg:z-10 transition-all duration-300 ease-in-out flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-4 ${sidebarCollapsed ? 'lg:p-2' : 'lg:p-6'} flex-1 flex flex-col`}>
          <div className="flex items-center justify-between mb-8">
            <Link href="/nexus" className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <img 
                src="/impactlogotransparent.png" 
                alt="Impact Logo" 
                className={`${sidebarCollapsed ? 'h-8 lg:h-10' : 'h-12 lg:h-16'} w-auto transition-all`}
              />
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden relative z-60"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Close button clicked')
                  setMobileMenuOpen(false)
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <nav className="space-y-1">
            {sidebarItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} relative overflow-hidden group ${
                    activeTab === item.id ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10' : ''
                  } ${item.placeholder ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (!item.placeholder) {
                      setActiveTab(item.id)
                      setMobileMenuOpen(false)
                    }
                  }}
                  disabled={item.placeholder}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <item.icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                  {!sidebarCollapsed && (
                    <>
                      {item.label}
                      {item.badge > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {activeTab === item.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Button>
              </motion.div>
            ))}
          </nav>
          
          <div className="mt-auto pt-6 border-t space-y-2">
            {/* User Section */}
            <div className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              {sidebarCollapsed ? (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500">
                    {session?.user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500">
                      {session?.user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session?.user?.email || 'Guest'}</p>
                    <p className="text-xs text-muted-foreground">Admin</p>
                  </div>
                </>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}
              title={sidebarCollapsed ? 'Settings' : ''}
            >
              <Settings className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
              {!sidebarCollapsed && 'Settings'}
            </Button>
            
            <Button 
              variant="ghost" 
              className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-red-500 hover:text-red-400 hover:bg-red-500/10`}
              title={sidebarCollapsed ? 'Sign Out' : ''}
              onClick={async () => {
                await signOut({ callbackUrl: '/' })
              }}
            >
              <LogOut className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
              {!sidebarCollapsed && 'Sign Out'}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex w-full justify-center relative z-60"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSidebarCollapsed(!sidebarCollapsed)
              }}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Flex grow to fill available space */}
      <div className="aimpact-main-content z-10 relative">
        {/* Modern Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-b bg-background/90"
        >
          <div className="p-4 lg:p-6">
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Mobile Menu Button */}
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden flex-shrink-0 border-primary/20 hover:bg-primary/10"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Left section - Module name */}
              <div className="flex-1 sm:flex-none sm:w-auto lg:w-1/3">
                <h3 className="text-sm lg:text-base font-medium text-muted-foreground truncate">
                  {activeTab === 'crm' && 'CRM'}
                  {activeTab === 'campaigns' && 'Campaigns'}
                  {activeTab === 'meetings' && 'Meetings'}
                  {activeTab === 'quotes' && 'Quotes'}
                  {activeTab === 'projects' && 'Projects'}
                  {activeTab === 'tickets' && 'Tickets'}
                  {activeTab === 'todo' && 'To Do'}
                  {activeTab === 'messaging' && 'Messaging'}
                  {activeTab === 'phone' && 'Phone'}
                  {activeTab === 'email' && 'Email'}
                  {activeTab === 'video' && 'Video'}
                  {activeTab === 'remote' && 'Remote'}
                  {activeTab === 'insights' && 'AI Insights'}
                </h3>
              </div>
              
              {/* Center section - Impact Nexus with Notification */}
              <div className="hidden sm:flex flex-1 lg:w-1/3 justify-center items-center gap-4">
                <div className="bg-background/90 px-6 py-2 rounded-lg border border-border">
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Impact Nexus
                  </h1>
                </div>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </Button>
              </div>
              
              {/* Right section - Quick Actions, NEXUS AI */}
              <div className="flex-1 lg:w-1/3 flex items-center justify-end gap-2 lg:gap-4">
                
                {/* Quick Actions - Hidden on small mobile */}
                <div className="hidden sm:flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    onClick={() => setShowFloatingPhone(!showFloatingPhone)}
                    title="Quick Call"
                  >
                    <Phone className={`h-5 w-5 ${showFloatingPhone ? 'text-green-500' : ''}`} />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    onClick={() => setShowFloatingSMS(!showFloatingSMS)}
                    title="Quick SMS"
                  >
                    <MessageCircle className={`h-5 w-5 ${showFloatingSMS ? 'text-blue-500' : ''}`} />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    onClick={() => setShowFloatingEmail(!showFloatingEmail)}
                    title="Quick Email"
                  >
                    <Mail className={`h-5 w-5 ${showFloatingEmail ? 'text-purple-500' : ''}`} />
                  </Button>
                </div>
                
                {/* NEXUS AI Assistant Toggle - Far Right */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="nexus-ai-button relative bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 ml-2"
                  onClick={() => setChatbotCollapsed(!chatbotCollapsed)}
                  title={chatbotCollapsed ? "Open NEXUS AI Personal Assistant" : "Close NEXUS AI Personal Assistant"}
                >
                  <div className="relative">
                    <img 
                      src="/impactlogotransparent.png" 
                      alt="NEXUS AI" 
                      className="h-5 w-5 object-contain"
                      loading="lazy"
                      style={{
                        filter: 'drop-shadow(0 0 2px rgba(168, 85, 247, 0.4))'
                      }}
                    />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Content Area with Animation */}
        <div className="flex-1 overflow-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 lg:p-6"
          >
              {/* Customer Lifecycle Workflow - in order */}
              {activeTab === 'crm' && <CRMInterface />}
              
              {activeTab === 'campaigns' && <EmailCampaigns />}
              
              {activeTab === 'meetings' && <MeetingHub />}
              
              {activeTab === 'quotes' && (
                <Quotes 
                  refreshTrigger={quotesRefreshTrigger}
                  onNavigate={(view, data) => {
                    // Only handle converting quote to project
                    if (view === 'projects' && data?.action === 'create-from-quote') {
                      // Convert quote to project
                      setActiveTab('projects')
                      // You could pass the quote data to create a new project
                    }
                  }}
                />
              )}
              
              {activeTab === 'projects' && (
                selectedProjectId ? (
                  <ProjectDetail 
                    projectId={selectedProjectId} 
                    onBack={() => setSelectedProjectId(null)} 
                  />
                ) : (
                  <ProjectsList 
                    onProjectSelect={(id) => setSelectedProjectId(id)} 
                  />
                )
              )}
              
              {activeTab === 'tickets' && <TicketingSystem />}
              
              {activeTab === 'todo' && <ComprehensiveToDo />}
              
              {activeTab === 'messaging' && <StreamMessaging />}
              {activeTab === 'email' && (
                <div className="bg-white rounded-lg min-h-[600px]">
                  <WorkingGmailInterface />
                </div>
              )}
              {activeTab === 'phone' && <PhoneSystemComplete />}
              {activeTab === 'remote' && <RemoteSupport />}
              {activeTab === 'insights' && <InsightsDashboard />}
              {activeTab === 'inbox' && <UnifiedInbox onNavigate={setActiveTab} />}
            </motion.div>
        </div>
      </div>
      
      {/* Resizable AI Chatbot - single instance that handles both states */}
      <div className={chatbotCollapsed ? '' : 'aimpact-chat-sidebar'} style={{ zIndex: 30 }}>
        <ResizableAgenticChatbot 
          isCollapsed={chatbotCollapsed}
          onCollapsedChange={setChatbotCollapsed}
          width={chatbotWidth}
          onWidthChange={setChatbotWidth}
          onNavigate={(tab, data) => {
            setActiveTab(tab)
            // If navigating to a specific project, set the selected project ID
            if (tab === 'projects' && data?.projectId) {
              setSelectedProjectId(data.projectId)
            }
            // If quote was created, trigger refresh
            if (tab === 'quotes' && data?.action === 'quote-created') {
              setQuotesRefreshTrigger(Date.now())
            }
          }}
          onOpenFloating={(type, data) => {
            // Open floating windows
            if (type === 'phone') {
              setFloatingPhoneData({
                phoneNumber: data?.phone_number,
                contactName: data?.contact_name
              })
              setShowFloatingPhone(true)
            } else if (type === 'sms') {
              setFloatingSMSData({
                phoneNumber: data?.phone_number,
                message: data?.message,
                contactName: data?.contact_name
              })
              setShowFloatingSMS(true)
            }
          }}
          currentContext={{
            module: activeTab,
            entityId: selectedProjectId || undefined,
            entityType: activeTab === 'projects' && selectedProjectId ? 'project' : undefined
          }}
        />
      </div>
      
      {/* Persistent Phone Service - Always connected in background */}
      <PersistentPhoneService />
      
      {/* Floating Windows */}
      <FloatingPhone 
        isOpen={showFloatingPhone}
        onClose={() => setShowFloatingPhone(false)}
        initialPhoneNumber={floatingPhoneData.phoneNumber}
        contactName={floatingPhoneData.contactName}
      />
      
      <FloatingSMSRedesigned
        isOpen={showFloatingSMS}
        onClose={() => setShowFloatingSMS(false)}
        initialPhoneNumber={floatingSMSData.phoneNumber}
        contactName={floatingSMSData.contactName}
      />
      
      <FloatingEmail
        isOpen={showFloatingEmail}
        onClose={() => setShowFloatingEmail(false)}
      />
      
      {/* Mobile Fixes */}
      <MobileFixes />
    </div>
  )
}




