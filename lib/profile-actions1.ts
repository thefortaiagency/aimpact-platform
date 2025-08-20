"use server"

import { updateUserProfile, updateUserImage, updateUserBanner, createUserProfile, getUserProfile } from "@/lib/db/queries";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

// Create a new user profile
export async function createProfileAction(userId: string, email: string) {
  return await createUserProfile(userId, email);
}


// For profile fields (name, handle, bio, etc.)
export async function updateProfileAction(
  userId: string,
  profile: {
    name?: string;
    handle?: string;
    bio?: string;
    email?: string;
    title?: string;
    location?: string;
    website?: string;
    image?: string;
    banner?: string;
  }
) {
  const result = await updateUserProfile(userId, profile);
  // Revalidate the profile page for this user
  revalidatePath(`/profile/${userId}`);
  return result;
}

// For profile fields (name, handle, bio, etc.)
export async function updateProfileAction1(
  userId: string,
  profile: {
    name?: string;
    handle?: string;
    bio?: string;
    email?: string;
    title?: string;
    location?: string;
    website?: string;
    image?: string;
    banner?: string;
  }
) {
  return await updateUserProfile(userId, profile);
  
}

// For just the profile image (Vercel Blob)
export async function uploadProfileImageAction(userId: string, file: File) {
  const { url } = await put(`profile-images/${userId}-${Date.now()}`, file, { access: "public" });
  await updateUserImage(userId, url);
  return url;
}

// For just the profile banner (Vercel Blob)
export async function uploadProfileBanner(userId: string, file: File) {
  const filename = `banner_${userId}.jpg`;
  const blob = await put(filename, file, { access: "public" });
  if (!blob?.url) throw new Error("Failed to upload banner image");
  await updateUserBanner(userId, blob.url);
  return blob.url;
}