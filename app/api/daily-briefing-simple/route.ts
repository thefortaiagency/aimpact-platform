import { NextRequest, NextResponse } from 'next/server'

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
    // Get date parameter from query string
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    
    // Set the target date (Eastern time)
    const now = new Date()
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    
    let targetDate = new Date(easternTime)
    if (dateParam === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1)
    }
    
    // Get weather for Fort Wayne
    const weather = await getWeather()
    
    // Get random motivational quote
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
    
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
      currentTime: easternTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        timeZone: 'America/New_York'
      }),
      timeOfDay: getTimeOfDay(),
      weather,
      motivationalQuote: randomQuote,
      // Placeholder data - in production would fetch from database
      todaysSchedule: {
        meetings: [],
        calendarConnected: false
      },
      metrics: {
        todaysMeetings: 0,
        openTickets: 0,
        activeProjects: 0,
        pendingQuotes: 0
      },
      suggestions: []
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
  const now = new Date()
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  const hour = easternTime.getHours()
  
  if (hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

// Get weather from Open-Meteo API
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
    // Return fallback weather
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

// Convert weather codes to conditions
function getWeatherCondition(code: number): string {
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
}