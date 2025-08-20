'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, Briefcase, Calendar, DollarSign, Users, Clock, 
  TrendingUp, AlertCircle, CheckCircle2, Edit, Save, X,
  Plus, MessageSquare, FileText, Target, Activity, BarChart,
  Settings, Hash, Ticket, Brain, ChevronRight, MoreVertical
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'

interface ProjectDetailProps {
  projectId: string
  onBack: () => void
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  assignee?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
}

interface Milestone {
  id: string
  name: string
  description?: string
  due_date: string
  status: 'pending' | 'in_progress' | 'completed'
  progress: number
}

export default function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tasks, setTasks] = useState<Task[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [tickets, setTickets] = useState<any[]>([])

  useEffect(() => {
    fetchProjectDetails()
    fetchProjectTasks()
    fetchProjectMilestones()
    fetchProjectTickets()
  }, [projectId])

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/aimpact/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjectTasks = async () => {
    // Simulated tasks for now
    setTasks([
      {
        id: '1',
        title: 'Complete Customer Lifecycle Workflow',
        description: 'Reorganize navigation to follow sales workflow',
        status: 'in_progress',
        priority: 'high',
        due_date: '2025-02-01'
      },
      {
        id: '2',
        title: 'Build AI-Powered Chatbot',
        description: 'Create internal chatbot with full context',
        status: 'todo',
        priority: 'high',
        due_date: '2025-02-15'
      },
      {
        id: '3',
        title: 'Connect Quotes to Projects',
        description: 'Automate project creation from won quotes',
        status: 'todo',
        priority: 'medium',
        due_date: '2025-02-10'
      }
    ])
  }

  const fetchProjectMilestones = async () => {
    // Simulated milestones
    setMilestones([
      {
        id: '1',
        name: 'Phase 1: Agentic Ticketing System',
        description: 'Complete ticketing system with AI',
        due_date: '2025-01-15',
        status: 'completed',
        progress: 100
      },
      {
        id: '2',
        name: 'Phase 2: Customer Lifecycle Management',
        description: 'Build complete CRM workflow',
        due_date: '2025-02-01',
        status: 'in_progress',
        progress: 35
      },
      {
        id: '3',
        name: 'Phase 3: AI Orchestration',
        description: 'Implement AI at every step',
        due_date: '2025-03-01',
        status: 'pending',
        progress: 0
      }
    ])
  }

  const fetchProjectTickets = async () => {
    try {
      const response = await fetch(`/api/aimpact/tickets?project=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  const handleSaveProject = async () => {
    // Save project changes
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'planning': return 'bg-blue-500'
      case 'on_hold': return 'bg-yellow-500'
      case 'completed': return 'bg-purple-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-500'
      case 'in_progress': return 'text-yellow-500'
      case 'review': return 'text-blue-500'
      case 'todo': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              {project.name}
            </h2>
            <p className="text-muted-foreground">
              {project.organization?.name || 'No organization'}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={`${getStatusColor(project.status)} bg-opacity-10 border-opacity-50`}
          >
            {project.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSaveProject}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          )}
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-xl font-bold">35%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <Progress value={35} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasks</p>
                <p className="text-xl font-bold">{tasks.length}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tickets</p>
                <p className="text-xl font-bold">{tickets.length}</p>
              </div>
              <Ticket className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-xl font-bold">${(project.budget || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Timeline</p>
                <p className="text-xl font-bold">8w</p>
              </div>
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="full-overview">Full Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Original Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Description</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={project.description}
                  onChange={(e) => setProject({...project, description: e.target.value})}
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-muted-foreground">
                  {project.description || 'No description available'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Full Project Plan */}
          {project.project_plan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Full Project Plan
                </CardTitle>
                <CardDescription>Detailed roadmap and deliverables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {typeof project.project_plan === 'string' 
                      ? project.project_plan 
                      : JSON.stringify(project.project_plan, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm">Task completed: "Setup database"</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm">New ticket created: "Fix login issue"</p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm">Milestone updated: "Phase 2"</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Timeline Risk</p>
                        <p className="text-xs text-muted-foreground">
                          3 tasks are behind schedule. Consider reallocating resources.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Ahead of Budget</p>
                        <p className="text-xs text-muted-foreground">
                          Current spend is 20% below projected. Good cost control!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Full Overview Tab - Comprehensive Full Page View */}
        <TabsContent value="full-overview" className="mt-6">
          {/* Full page white background container */}
          <div className="bg-white rounded-lg shadow-lg -mx-6 -mt-6 min-h-screen">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-t-lg">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
                <p className="text-blue-100 mb-4">{project.organization?.name || 'No organization'}</p>
                <div className="flex items-center gap-4">
                  <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                    Status: {project.status}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                    Budget: ${(project.budget || 0).toLocaleString()}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                    Timeline: 8 weeks
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                    Progress: 35%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
              {/* Project Description Section */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <FileText className="h-5 w-5" />
                  Project Description
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {project.description || 'No description available'}
                </p>
              </div>

              {/* Complete Project Specifications */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                  <Target className="h-5 w-5" />
                  Project Specifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-600 mb-2">Key Deliverables</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-gray-700">Complete Customer Lifecycle Management System</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-gray-700">AI-Powered Chatbot with Full System Control</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span className="text-gray-700">Automated Quote to Project Conversion</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-700">Email Campaign Management System</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-600 mb-2">Technical Requirements</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-gray-700">Next.js 15 with TypeScript</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-gray-700">Supabase Database Integration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-gray-700">OpenAI GPT-4 Integration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-gray-700">Real-time Updates via WebSocket</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* All Project Stages/Milestones */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                  <Target className="h-5 w-5" />
                  Project Stages & Milestones
                </h2>
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="border-l-4 border-gray-200 pl-4 ml-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${
                              milestone.status === 'completed' ? 'bg-green-500' :
                              milestone.status === 'in_progress' ? 'bg-yellow-500' :
                              'bg-gray-300'
                            }`} />
                            <h3 className="font-semibold text-lg text-gray-900">{milestone.name}</h3>
                            <Badge variant={
                              milestone.status === 'completed' ? 'default' :
                              milestone.status === 'in_progress' ? 'secondary' :
                              'outline'
                            }>
                              {milestone.status === 'completed' ? 'Completed' :
                               milestone.status === 'in_progress' ? 'In Progress' :
                               'Pending'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mt-1 ml-6">
                            {milestone.description}
                          </p>
                          <div className="flex items-center gap-6 mt-2 ml-6">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(milestone.due_date).toLocaleDateString()}
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              Progress: {milestone.progress}%
                            </span>
                          </div>
                          <Progress value={milestone.progress} className="w-full h-2 mt-2 ml-6" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Tasks with Status and Assignment */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                  <CheckCircle2 className="h-5 w-5" />
                  All Tasks & Assignments
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-700">Task</th>
                        <th className="text-left p-3 font-medium text-gray-700">Status</th>
                        <th className="text-left p-3 font-medium text-gray-700">Priority</th>
                        <th className="text-left p-3 font-medium text-gray-700">Assignee</th>
                        <th className="text-left p-3 font-medium text-gray-700">Due Date</th>
                        <th className="text-left p-3 font-medium text-gray-700">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {tasks.map(task => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{task.title}</p>
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant={
                              task.status === 'done' ? 'default' :
                              task.status === 'in_progress' ? 'secondary' :
                              task.status === 'review' ? 'outline' :
                              'destructive'
                            }>
                              {task.status === 'todo' ? 'To Do' :
                               task.status === 'in_progress' ? 'In Progress' :
                               task.status === 'review' ? 'Review' :
                               'Done'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant={
                              task.priority === 'high' ? 'destructive' :
                              task.priority === 'medium' ? 'default' :
                              'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {task.assignee ? task.assignee.split(' ').map(n => n[0]).join('') : 'UA'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-700">{task.assignee || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-700">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                          </td>
                          <td className="p-3">
                            <div className="w-20">
                              <Progress 
                                value={
                                  task.status === 'done' ? 100 :
                                  task.status === 'in_progress' ? 50 :
                                  task.status === 'review' ? 75 :
                                  0
                                } 
                                className="h-2"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Project Timeline Visual */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                  <Activity className="h-5 w-5" />
                  Project Timeline
                </h2>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500"></div>
                  <div className="space-y-6 ml-6">
                    <div className="flex items-start gap-4">
                      <div className="w-4 h-4 bg-green-500 rounded-full -ml-8 mt-1"></div>
                      <div>
                        <p className="font-medium text-gray-900">Project Kickoff</p>
                        <p className="text-sm text-gray-500">Jan 1, 2025 - Completed</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full -ml-8 mt-1 animate-pulse"></div>
                      <div>
                        <p className="font-medium text-gray-900">Phase 2: Customer Lifecycle</p>
                        <p className="text-sm text-gray-500">Jan 15, 2025 - In Progress</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-4 h-4 bg-gray-300 rounded-full -ml-8 mt-1"></div>
                      <div>
                        <p className="font-medium text-gray-900">Phase 3: AI Orchestration</p>
                        <p className="text-sm text-gray-500">Mar 1, 2025 - Upcoming</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-4 h-4 bg-gray-300 rounded-full -ml-8 mt-1"></div>
                      <div>
                        <p className="font-medium text-gray-900">Project Completion</p>
                        <p className="text-sm text-gray-500">Mar 15, 2025 - Target</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team & Resources */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                  <Users className="h-5 w-5" />
                  Team & Resource Allocation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar>
                        <AvatarFallback>PM</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">Project Manager</p>
                        <p className="text-sm text-gray-500">Lead</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>• 3 tasks assigned</p>
                      <p>• 85% utilization</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar>
                        <AvatarFallback>FD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">Frontend Dev</p>
                        <p className="text-sm text-gray-500">Developer</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>• 5 tasks assigned</p>
                      <p>• 100% utilization</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar>
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">AI Engineer</p>
                        <p className="text-sm text-gray-500">Specialist</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>• 2 tasks assigned</p>
                      <p>• 60% utilization</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Dashboard */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                  <BarChart className="h-5 w-5" />
                  Key Project Metrics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">35%</p>
                    <p className="text-sm text-gray-500">Overall Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">2/3</p>
                    <p className="text-sm text-gray-500">Milestones Complete</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600">8</p>
                    <p className="text-sm text-gray-500">Active Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">3</p>
                    <p className="text-sm text-gray-500">Team Members</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Project Tasks</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Todo Column */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">To Do ({tasks.filter(t => t.status === 'todo').length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.filter(t => t.status === 'todo').map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-sm">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* In Progress Column */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">In Progress ({tasks.filter(t => t.status === 'in_progress').length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.filter(t => t.status === 'in_progress').map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-sm border-yellow-500/50">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* Done Column */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Done ({tasks.filter(t => t.status === 'done').length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.filter(t => t.status === 'done').map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-sm opacity-60">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-through">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Project Milestones</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
          
          <div className="space-y-4">
            {milestones.map(milestone => (
              <Card key={milestone.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{milestone.name}</h4>
                        <Badge variant={
                          milestone.status === 'completed' ? 'default' :
                          milestone.status === 'in_progress' ? 'secondary' :
                          'outline'
                        }>
                          {milestone.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(milestone.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{milestone.progress}%</p>
                      <Progress value={milestone.progress} className="w-24 h-2 mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Related Tickets</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>
          
          {tickets.length === 0 ? (
            <Card className="p-8 text-center">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No tickets linked to this project yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => (
                <Card key={ticket.id} className="hover:shadow-sm cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{ticket.number}</Badge>
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.status} • {ticket.priority} priority
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Project Team</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>PM</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Project Manager</p>
                    <p className="text-sm text-muted-foreground">Admin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Project Name</Label>
                <Input
                  value={project.name}
                  onChange={(e) => setProject({...project, name: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={project.status}
                  onValueChange={(value) => setProject({...project, status: value})}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget</Label>
                <Input
                  type="number"
                  value={project.budget || ''}
                  onChange={(e) => setProject({...project, budget: parseInt(e.target.value)})}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}