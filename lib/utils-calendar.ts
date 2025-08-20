import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatTime(time: string): string {
  // Convert 24-hour format to 12-hour format
  const [hours, minutes] = time.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const formattedHours = hours % 12 || 12
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`
}

export function getTimeSlots(startHour: number, endHour: number): string[] {
  const slots = []
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`)
    slots.push(`${hour.toString().padStart(2, "0")}:30`)
  }
  return slots
}

export function getDaysInWeek(date: Date): Date[] {
  const days = []
  const currentDate = new Date(date)
  const day = currentDate.getDay() // 0 = Sunday, 6 = Saturday

  // Go to the first day of the week (Sunday)
  currentDate.setDate(currentDate.getDate() - day)

  // Get all 7 days of the week
  for (let i = 0; i < 7; i++) {
    days.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}

export function getDaysInMonth(date: Date): Date[] {
  const days = []
  const year = date.getFullYear()
  const month = date.getMonth()

  // Create a date for the first day of the month
  const firstDay = new Date(year, month, 1)

  // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDay.getDay()

  // Add days from the previous month to fill the first row
  const lastDayOfPrevMonth = new Date(year, month, 0)
  const daysInPrevMonth = lastDayOfPrevMonth.getDate()

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = new Date(year, month - 1, daysInPrevMonth - i)
    days.push(day)
  }

  // Add all days in the current month
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i)
    days.push(day)
  }

  // Add days from the next month to complete the grid (6 rows x 7 days = 42 cells)
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const day = new Date(year, month + 1, i)
    days.push(day)
  }

  return days
}