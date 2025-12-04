'use server';

import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File;
  const oldAvatarUrl = formData.get('oldAvatarUrl') as string;
  if (!file) {
    throw new Error('No file provided.');
  }

  const MAX_FILE_SIZE_KB = 200;
  if (file.size > MAX_FILE_SIZE_KB * 1024) {
    throw new Error(`File size cannot exceed ${MAX_FILE_SIZE_KB}KB.`);
  }

  // Delete the old avatar if it exists and is a local file
  if (oldAvatarUrl && oldAvatarUrl.startsWith('/images/avatars/')) {
    const oldAvatarPath = join(process.cwd(), 'public', oldAvatarUrl);
    try {
      await unlink(oldAvatarPath);
    } catch (error: any) {
      // If the file doesn't exist, we can ignore the error.
      // For other errors, log them but don't block the new upload.
      if (error.code !== 'ENOENT') {
        console.error('Error deleting old avatar:', error);
      }
    }
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const extension = file.name.split('.').pop() || 'png';
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
  const randomText = uuidv4().split('-')[0]; // An 8-character random hex string
  const filename = `${randomSixDigits}-${randomText}.${extension}`;

  const uploadDir = join(process.cwd(), 'public/images/avatars');
  const path = join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });

  await writeFile(path, buffer);

  const fileUrl = `/images/avatars/${filename}`;
  return { url: fileUrl };
}