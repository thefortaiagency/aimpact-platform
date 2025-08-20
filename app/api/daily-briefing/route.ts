import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Motivational quotes for business leaders
const motivationalQuotes = [
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { quote: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { quote: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { quote: "The road to success and the road to failure are almost exactly the same.", author: "Colin R. Davis" },
  { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { quote: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs" },
  { quote: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "A goal is a dream with a deadline.", author: "Napoleon Hill" },
  { quote: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseClient()
    
    // Get date parameter from query string
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    
    // Set the target date based on parameter (using Eastern time)
    const easternNow = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}))
    let targetDate = new Date(easternNow)
    if (dateParam === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    targetDate.setHours(0, 0, 0, 0)
    
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)
    const weekFromNow = new Date(targetDate)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    // Get meetings from Google Calendar - THIS IS THE MOST IMPORTANT PART
    let todaysMeetings = []
    let googleCalendarConnected = false
    
    try {
      // Call the WORKING calendar/events endpoint that the meetings page uses
      const baseUrl = request.nextUrl.origin
      const timeMin = targetDate.toISOString()
      const timeMax = nextDay.toISOString()
      
      const calendarUrl = `${baseUrl}/api/aimpact/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      
      const calendarResponse = await fetch(calendarUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        }
      })
      
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        
        if (calendarData.events && calendarData.events.length > 0) {
          todaysMeetings = calendarData.events.map((event: any) => ({
            id: event.id,
            title: event.title || 'Untitled Event',
            time: event.isAllDay ? 'All Day' : new Date(event.start).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              timeZone: 'America/New_York'
            }),
            duration: event.isAllDay ? 1440 : Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000),
            type: event.hangoutLink || event.meetingUrl ? 'video' : 'meeting',
            location: event.location || (event.hangoutLink ? 'Google Meet' : ''),
            description: event.description,
            attendees: event.attendees?.map((a: any) => a.email) || [],
            link: event.hangoutLink || event.meetingUrl
          }))
          googleCalendarConnected = true
          console.log(`Successfully fetched ${todaysMeetings.length} Google Calendar events`)
        }
      } else {
        console.error('Failed to fetch from calendar/events endpoint:', await calendarResponse.text())
      }
    } catch (error) {
      console.error('Error calling calendar/events:', error)
    }
    
    // ONLY use local database as fallback if Google Calendar fails
    if (!googleCalendarConnected) {
      console.log('Google Calendar not available, using local database fallback')
      const { data: localMeetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .gte('date', targetDate.toISOString().split('T')[0])
        .lte('date', nextDay.toISOString().split('T')[0])
        .order('time', { ascending: true })
      
      if (meetingsError) {
        console.error('Local meetings error:', meetingsError)
      }
      
      todaysMeetings = (localMeetings || []).map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        time: meeting.time,
        duration: meeting.duration,
        type: meeting.type,
        location: meeting.location
      }))
    }

    // Get open tickets
    const { data: openTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'open')
      .is('deleted_at', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (ticketsError) console.error('Tickets error:', ticketsError)

    // Get active projects
    const { data: activeProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(5)
    
    if (projectsError) console.error('Projects error:', projectsError)

    // Get pending quotes
    const { data: pendingQuotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (quotesError) console.error('Quotes error:', quotesError)

    // Skip email tracking for now
    const recentEmails: any[] = []

    // Get recent calls (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { data: recentCalls, error: callsError } = await supabase
      .from('phone_call_logs')
      .select('*')
      .gte('timestamp', oneDayAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(5)
    
    if (callsError) console.error('Calls error:', callsError)

    // Get new leads (organizations added in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data: newLeads, error: leadsError } = await supabase
      .from('organizations')
      .select('*')
      .eq('type', 'lead')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (leadsError) console.error('Leads error:', leadsError)

    // Calculate metrics
    const metrics = {
      todaysMeetings: todaysMeetings?.length || 0,
      openTickets: openTickets?.length || 0,
      activeProjects: activeProjects?.length || 0,
      pendingQuotes: pendingQuotes?.length || 0,
      unreadEmails: recentEmails?.length || 0,
      recentCalls: recentCalls?.length || 0,
      newLeadsThisWeek: newLeads?.length || 0
    }

    // Get random motivational quote
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]

    // Generate smart suggestions based on data
    const suggestions = []
    
    if ((pendingQuotes?.length || 0) > 0) {
      suggestions.push({
        type: 'follow_up',
        priority: 'high',
        title: 'Follow up on pending quotes',
        description: `You have ${pendingQuotes?.length || 0} quotes awaiting response. Following up could close deals today.`,
        action: 'Review and follow up on quotes'
      })
    }

    if ((openTickets?.length || 0) > 2) {
      suggestions.push({
        type: 'support',
        priority: 'high',
        title: 'Address support tickets',
        description: `${openTickets?.length || 0} tickets need attention. Quick responses improve client satisfaction.`,
        action: 'Prioritize and resolve tickets'
      })
    }

    if ((newLeads?.length || 0) > 0) {
      suggestions.push({
        type: 'sales',
        priority: 'medium',
        title: 'Engage new leads',
        description: `${newLeads?.length || 0} new leads this week. Initial contact within 24 hours increases conversion by 60%.`,
        action: 'Reach out to new leads'
      })
    }

    if ((todaysMeetings?.length || 0) === 0) {
      suggestions.push({
        type: 'planning',
        priority: 'low',
        title: 'Schedule client check-ins',
        description: 'No meetings today. Perfect time to schedule check-ins with key clients.',
        action: 'Schedule follow-up meetings'
      })
    }

    if ((recentEmails?.length || 0) > 5) {
      suggestions.push({
        type: 'communication',
        priority: 'medium',
        title: 'Clear email backlog',
        description: `${recentEmails?.length || 0} unread emails. Inbox zero improves focus and reduces stress.`,
        action: 'Process email inbox'
      })
    }

    // Get todos for today from the database
    let todaysTodos = []
    try {
      const { data: todos, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_email', session.user.email || session.user.id)
        .eq('completed', false)
        .eq('archived', false)
        .gte('due_date', targetDate.toISOString().split('T')[0])
        .lt('due_date', nextDay.toISOString().split('T')[0])
        .order('priority', { ascending: false })
        .order('due_time', { ascending: true })
      
      if (!todosError && todos) {
        todaysTodos = todos.map(todo => ({
          id: todo.id,
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          category: todo.category,
          time: todo.due_time || 'No time set',
          tags: todo.tags || [],
          googleCalendarLink: todo.google_event_link
        }))
      }
    } catch (error) {
      console.error('Error fetching todos:', error)
    }

    // Get weather for Fort Wayne, Indiana
    const weather = await getWeather()

    // Format briefing data
    const briefing = {
      date: targetDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      isToday: dateParam !== 'tomorrow',
      isTomorrow: dateParam === 'tomorrow',
      currentTime: new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      }),
      timeOfDay: getTimeOfDay(),
      metrics,
      todaysSchedule: {
        meetings: todaysMeetings,
        todos: todaysTodos,
        sourceType: googleCalendarConnected ? 'google_calendar' : 'local_database',
        calendarConnected: googleCalendarConnected
      },
      priorities: {
        tickets: (openTickets || []).slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          client: t.organization_id,
          age: getDaysAgo(new Date(t.created_at))
        })),
        quotes: (pendingQuotes || []).slice(0, 3).map(q => ({
          id: q.id,
          title: q.title,
          amount: q.total_amount,
          client: q.organization_id,
          age: getDaysAgo(new Date(q.created_at))
        })),
        projects: (activeProjects || []).slice(0, 3).map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          client: p.organization_id,
          lastUpdate: getDaysAgo(new Date(p.updated_at))
        }))
      },
      suggestions: suggestions.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }),
      communications: {
        unreadEmails: (recentEmails || []).slice(0, 5).map(e => ({
          id: e.id,
          from: e.from,
          subject: e.subject,
          preview: e.body?.substring(0, 100),
          time: getTimeAgo(new Date(e.received_at))
        })),
        recentCalls: (recentCalls || []).map(c => ({
          id: c.id,
          number: c.phone_number,
          direction: c.direction,
          duration: c.duration,
          time: getTimeAgo(new Date(c.timestamp))
        }))
      },
      weather,
      motivationalQuote: randomQuote,
      insights: generateInsights(metrics, todaysMeetings?.length || 0)
    }

    return NextResponse.json(briefing)

  } catch (error) {
    console.error('Daily briefing error:', error)
    return NextResponse.json(
      { error: 'Failed to generate daily briefing' },
      { status: 500 }
    )
  }
}

function getTimeOfDay(): string {
  // Get current hour in Eastern time
  const now = new Date()
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  const hour = easternTime.getHours()
  
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function getDaysAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function getTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return getDaysAgo(date)
}

function generateInsights(metrics: any, meetingCount: number): string[] {
  const insights = []
  
  if (metrics.openTickets > 5) {
    insights.push('High ticket volume detected. Consider delegating or automating common issues.')
  }
  
  if (metrics.pendingQuotes > 3) {
    insights.push('Multiple quotes pending. Today is perfect for closing deals.')
  }
  
  if (meetingCount === 0) {
    insights.push('Calendar is open - great opportunity for deep work or proactive outreach.')
  } else if (meetingCount > 4) {
    insights.push('Busy meeting day ahead. Remember to schedule breaks between calls.')
  }
  
  if (metrics.newLeadsThisWeek > 5) {
    insights.push('Strong lead generation this week! Prioritize quick follow-ups.')
  }
  
  if (metrics.unreadEmails > 20) {
    insights.push('Email backlog building up. Consider batch processing or delegation.')
  }
  
  return insights
}

// Get weather from Open-Meteo API (no key required!)
async function getWeather() {
  try {
    // Fort Wayne, Indiana coordinates
    const latitude = 41.0793
    const longitude = -85.1394
    
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America/Indiana/Indianapolis`
    )
    
    if (!response.ok) {
      throw new Error('Weather API failed')
    }
    
    const data = await response.json()
    
    return {
      temperature: Math.round(data.current.temperature_2m),
      feels_like: Math.round(data.current.apparent_temperature),
      condition: getWeatherCondition(data.current.weather_code),
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      precipitation: data.daily.precipitation_sum[0],
      wind_speed: Math.round(data.current.wind_speed_10m),
      location: 'Fort Wayne, IN'
    }
  } catch (error) {
    console.error('Weather fetch error:', error)
    // Return fallback weather if API fails
    return {
      temperature: 72,
      feels_like: 72,
      condition: 'Partly Cloudy',
      high: 78,
      low: 65,
      precipitation: 0,
      wind_speed: 10,
      location: 'Fort Wayne, IN'
    }
  }
}

// Convert weather codes to human-readable conditions
function getWeatherCondition(code: number): string {
  // WMO Weather interpretation codes
  // https://open-meteo.com/en/docs
  if (code === 0) return '☀️ Clear Sky'
  if (code === 1) return '🌤️ Mainly Clear'
  if (code === 2) return '⛅ Partly Cloudy'
  if (code === 3) return '☁️ Overcast'
  if (code <= 48) return '🌫️ Foggy'
  if (code <= 57) return '🌦️ Drizzle'
  if (code <= 65) return '🌧️ Rain'
  if (code === 66 || code === 67) return '🌨️ Freezing Rain'
  if (code <= 77) return '❄️ Snow'
  if (code === 80 || code === 81) return '🌧️ Rain Showers'
  if (code === 82) return '⛈️ Heavy Rain'
  if (code === 85 || code === 86) return '🌨️ Snow Showers'
  if (code >= 95) return '⛈️ Thunderstorm'
  return '☁️ Cloudy'
}// Todo integration complete
