import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env'

const buildClient = () => {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  })
}

type SignedUploadPayload = {
  key: string
  contentType: string
}

export const createSignedUploadUrl = async ({ key, contentType }: SignedUploadPayload) => {
  if (!env.r2BucketName) {
    throw new Error('R2 bucket name is not configured')
  }

  const client = buildClient()
  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 })
  const publicUrl = env.r2PublicBaseUrl
    ? `${env.r2PublicBaseUrl.replace(/\/$/, '')}/${key}`
    : null

  return {
    uploadUrl,
    key,
    publicUrl,
  }
}

export const createSignedReadUrl = async (key: string) => {
  if (!env.r2BucketName) {
    throw new Error('R2 bucket name is not configured')
  }

  const client = buildClient()
  const command = new GetObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn: 60 * 60 })
}

type DirectUploadPayload = {
  key: string
  contentType: string
  body: Buffer | Uint8Array
}

export const uploadBufferToR2 = async ({ key, contentType, body }: DirectUploadPayload) => {
  if (!env.r2BucketName) {
    throw new Error('R2 bucket name is not configured')
  }

  const client = buildClient()
  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    ContentType: contentType,
    Body: body,
  })

  await client.send(command)

  const publicUrl = env.r2PublicBaseUrl
    ? `${env.r2PublicBaseUrl.replace(/\/$/, '')}/${key}`
    : await createSignedReadUrl(key)

  return {
    key,
    publicUrl,
  }
}