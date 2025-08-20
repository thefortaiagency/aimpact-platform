import { put } from '@vercel/blob';

// Helper function to upload image to Vercel Blob Storage
export async function uploadImageToBlob(file: File) {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `uploads/${timestamp}-${random}.${extension}`;
    
    console.log('Attempting to upload to Vercel Blob:', filename, 'Size:', file.size);
    
    // Upload to Vercel Blob Storage
    const blob = await put(filename, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log('Upload successful:', blob);

    return {
      url: blob.url,
      filename: filename,
      downloadUrl: blob.downloadUrl,
    };
  } catch (error) {
    console.error('Vercel Blob upload error:', error);
    throw error;
  }
}