import { uploadImage as uploadToCloudinary } from './cloudinary';


const ALLOWED = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImage(file) {
  if (!ALLOWED.includes(file.type)) {
    return `${file.name}: use JPG, PNG, WebP or AVIF.`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: images must be under 5 MB.`;
  }

  return null;
}

export async function uploadImage(folder, file, onProgress) {
  const err = validateImage(file);

  if (err) {
    throw new Error(err);
  }

  // Upload image to Cloudinary
  const url = await uploadToCloudinary(file);

  return url;
}

// Cloudinary deletion requires a secure backend.
// Keep this function to preserve existing imports.
export async function deleteImageByUrl(url) {
  // Image remains in Cloudinary when removed from the app.
  return;
}
