// Types and configurations for streaming applications

// Type for streaming app keys
export type StreamingAppKey = "vCamp" | "vCoach" | "vPractice"

// Configuration for streaming applications
export const STREAMING_APPS: Record<StreamingAppKey, { name: string; description: string }> = {
  vCamp: {
    name: "Virtual Camp",
    description: "Interactive virtual training camps with multiple participants and instructors.",
  },
  vCoach: {
    name: "Virtual Coach",
    description: "One-on-one virtual coaching sessions with professional trainers.",
  },
  vPractice: {
    name: "Virtual Practice",
    description: "Self-guided practice sessions with recorded instructions and feedback.",
  },
}

// Generate a unique stream name for an app
export function generateAppStreamName(appKey: StreamingAppKey): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `${appKey.toLowerCase()}-${timestamp}-${random}`
}
