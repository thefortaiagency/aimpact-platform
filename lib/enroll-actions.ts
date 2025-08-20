"use server"

import {
  getAllTrainingSessions,
  getUserTrainingSessions,
  isUserEnrolledInTraining,
  enrollUserInTraining1,
} from "./db/queries"
import { auth } from "@/app/(auth)/auth"
import { revalidatePath } from "next/cache"

// Fetch all available training sessions
export async function fetchTrainings() {
  try {
    const trainings = await getAllTrainingSessions()
    return { success: true, data: trainings }
  } catch (error) {
    console.error("Error fetching trainings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch trainings",
    }
  }
}


// Fetch user's enrolled training sessions
export async function fetchUserTrainings1(userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "User ID not provided" }
    }
    const trainings = await getUserTrainingSessions(userId)
    console.log("getUserTrainingSessions output:", trainings) // Logs the complete output
    return { success: true, data: trainings }
  } catch (error) {
    console.error("Error fetching user trainings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user trainings",
    }
  }
}


// Fetch user's enrolled training sessions
export async function fetchUserTrainings() {
  try {
    const session = await auth()
    if (!session || !session.user.id) {
        return { success: false, error: "User not authenticated" }
    }
    const trainings = await getUserTrainingSessions(session.user.id)
    return { success: true, data: trainings }
  } catch (error) {
    console.error("Error fetching user trainings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user trainings",
    }
  }
}

// Enroll user in a training session
export async function enrollInTraining(trainingId: string) {
  try {
    const session = await auth()
    if ( !session || !session.user.id ) {
        return { success: false, error: "User not authenticated" }
    }
    // Check if already enrolled
    const isEnrolled = await isUserEnrolledInTraining(session.user.id, trainingId)

    if (isEnrolled) {
      return { success: true, message: "Successfully enrolled!" }
    }

    // Enroll user
    await enrollUserInTraining1(session.user.id, trainingId)

    // Revalidate the dashboard page to show updated data
    revalidatePath("/virtual")

    return { success: true, message: "Enrolled successfully" }
  } catch (error) {
    console.error("Error enrolling in training:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to enroll in training",
    }
  }
}