"use server";

import { createBugReport } from "./db/queries";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export async function submitBugReportToDb(formData: FormData) {
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as "low" | "medium" | "high";
  const tags = JSON.parse(formData.get("tags") as string) as string[];
  const createdBy = formData.get("createdBy") as string | undefined;
  const screenshotDataUrl = formData.get("screenshotDataUrl") as string | undefined;

  let screenshotUrl: string | undefined = undefined;

  if (screenshotDataUrl && screenshotDataUrl.startsWith("data:image/")) {
    // Extract base64 and upload to Vercel Blob
    const base64 = screenshotDataUrl.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    const filename = `bug-screenshot-${randomUUID()}.png`;
    const blob = await put(filename, buffer, { access: "public" });
    screenshotUrl = blob.url;
  }

  const bug = await createBugReport({
    description,
    priority,
    tags,
    createdBy,
    screenshotUrl,
  });

  return { success: true, bug };
}