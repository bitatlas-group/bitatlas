import * as Minio from 'minio';
import { config } from '../config';

export const minioClient = new Minio.Client({
  endPoint: config.MINIO_ENDPOINT,
  port: config.MINIO_PORT,
  useSSL: config.MINIO_USE_SSL,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
});

export const BUCKET = config.MINIO_BUCKET;

export async function ensureBucketExists(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET, 'eu-central-1');
    // Block all public access — objects only accessible via presigned URLs
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET}/*`,
          Condition: {
            StringNotLike: {
              'aws:Referer': '',
            },
          },
        },
      ],
    });
    await minioClient.setBucketPolicy(BUCKET, policy);
    console.log(`[MinIO] Created bucket: ${BUCKET}`);
  }
}

function rewritePresignedUrl(url: string): string {
  if (!config.MINIO_PUBLIC_URL) return url;
  const internalPrefix = `http://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`;
  return url.startsWith(internalPrefix)
    ? config.MINIO_PUBLIC_URL + url.slice(internalPrefix.length)
    : url;
}

export async function generateUploadUrl(
  storageKey: string,
  contentType: string,
  expirySeconds = config.MINIO_PRESIGNED_URL_EXPIRY
): Promise<string> {
  const url = await minioClient.presignedPutObject(BUCKET, storageKey, expirySeconds);
  return rewritePresignedUrl(url);
}

export async function generateDownloadUrl(
  storageKey: string,
  expirySeconds = config.MINIO_PRESIGNED_URL_EXPIRY
): Promise<string> {
  const url = await minioClient.presignedGetObject(BUCKET, storageKey, expirySeconds);
  return rewritePresignedUrl(url);
}

export async function deleteObject(storageKey: string): Promise<void> {
  await minioClient.removeObject(BUCKET, storageKey);
}

export async function checkMinioHealth(): Promise<boolean> {
  try {
    await minioClient.bucketExists(BUCKET);
    return true;
  } catch {
    return false;
  }
}
