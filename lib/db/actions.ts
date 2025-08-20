// app/lib/db/actions.ts
"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { getProfile, updateUserImage } from './queries';

export async function uploadProfileImage(userId: string, formData: FormData): Promise<void> {
  try {
    const file = formData.get("image") as File;
    if (!file || file.size === 0) {
      throw new Error("No file uploaded");
    }

    const filename = `${userId}_avatar.jpg`;

    // Check if an existing image exists
    const existingProfile = await getProfile(userId);
    if (existingProfile?.image) {
      try {
        await del(existingProfile.image);
      } catch (error) {
        console.error("Failed to delete existing image:", error);
      }
    }

    // Upload new image
    const { url } = await put(filename, file, { access: 'public' });

    // Update database
    await updateUserImage(userId, url);

    // Revalidate the page
    revalidatePath(`/profile/${userId}`);
  } catch (error) {
    console.error("Failed to upload profile image:", error);
    throw error; // Rethrow to allow form to handle errors if needed
  }
}