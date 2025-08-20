export interface Training {
  id: string
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  instructor: string
  category: string
  location?: string
  agenda: string[]
  maxParticipants?: number
  currentParticipants?: number
}