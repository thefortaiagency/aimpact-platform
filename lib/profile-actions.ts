"use server";

import { put, del, list } from "@vercel/blob";
import { updateUserImage1, updateUserBanner1, updateUserProfile1 } from "./db/queries";
import { auth } from "@/app/(auth)/auth";

export async function uploadProfileImage1(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const userId = session.user.id;
    const filename = `profile-images/${userId}.png`;

    // Check if existing image exists and delete it
    try {
      const { blobs } = await list({ prefix: `profile-images/${userId}` });
      for (const blob of blobs) {
        await del(blob.url);
      }
    } catch (error) {
      // Ignore errors if no existing image
      console.log("No existing image to delete");
    }

    // Upload new image
    const blob = await put(filename, file, { access: "public" });

    // Update database with new image URL
    const updatedUser = await updateUserImage1(userId, blob.url);
    
    if (!updatedUser) {
      return { success: false, error: "Failed to update database" };
    }

    return { success: true, imageUrl: blob.url };
  } catch (error) {
    console.error("Failed to upload profile image:", error);
    return { success: false, error: "Upload failed" };
  }
}

export async function uploadBannerImage1(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const userId = session.user.id;
    const filename = `banner-images/${userId}.png`;

    // Check if existing banner exists and delete it
    try {
      const { blobs } = await list({ prefix: `banner-images/${userId}` });
      for (const blob of blobs) {
        await del(blob.url);
      }
    } catch (error) {
      console.log("No existing banner to delete");
    }

    // Upload new banner
    const blob = await put(filename, file, { access: "public" });

    // Update database with new banner URL
    const updatedUser = await updateUserBanner1(userId, blob.url);
    
    if (!updatedUser) {
      return { success: false, error: "Failed to update database" };
    }

    return { success: true, imageUrl: blob.url };
  } catch (error) {
    console.error("Failed to upload banner image:", error);
    return { success: false, error: "Upload failed" };
  }
}

export async function updateProfile1(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const handle = formData.get("handle") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    const updatedUser = await updateUserProfile1(session.user.id, {
      name: name || undefined,
      bio: bio || undefined,
      handle: handle || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });

    if (!updatedUser) {
      return { success: false, error: "Failed to update profile" };
    }

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "Update failed" };
  }
}