import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME
) {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    // Only warn in dev or runtime, don't crash build if envs are missing (e.g. CI)
    // But waiting for user to provide them to safely initialize.
    console.warn('R2 Environment variables missing. Uploads will fail.');
  }
}

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  fileBuffer: Buffer,
  key: string,
  contentType: string = 'image/png'
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await R2.send(command);

    // Construct public URL
    // If R2_PUBLIC_URL ends with slash, remove it for consistency
    const baseUrl = R2_PUBLIC_URL.endsWith('/')
      ? R2_PUBLIC_URL.slice(0, -1)
      : R2_PUBLIC_URL;
    // Key often contains 'folder/filename'.
    return `${baseUrl}/${key}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload image to storage');
  }
}
