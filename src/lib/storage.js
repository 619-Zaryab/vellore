import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function validateImage(file) {
    if (!ALLOWED.includes(file.type))
        return `${file.name}: use JPG, PNG, WebP or AVIF.`;
    if (file.size > MAX_IMAGE_BYTES)
        return `${file.name}: images must be under 5 MB.`;
    return null;
}
export async function uploadImage(folder, file, onProgress) {
    const err = validateImage(file);
    if (err)
        throw new Error(err);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r = ref(storage, `${folder}/${Date.now()}-${safe}`);
    const task = uploadBytesResumable(r, file, { contentType: file.type });
    await new Promise((resolve, reject) => {
        task.on('state_changed', (s) => onProgress?.((s.bytesTransferred / s.totalBytes) * 100), reject, () => resolve());
    });
    return getDownloadURL(r);
}
export async function deleteImageByUrl(url) {
    try {
        await deleteObject(ref(storage, url));
    }
    catch { /* already gone or not ours */ }
}
