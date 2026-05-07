import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export const r2Enabled = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
)

export const r2Client = r2Enabled
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? ''

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  if (!r2Client) throw new Error('R2 no configurado')
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

export async function getFromR2(key: string): Promise<Buffer> {
  if (!r2Client) throw new Error('R2 no configurado')
  const res = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as any) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export async function deleteFromR2(key: string) {
  if (!r2Client) throw new Error('R2 no configurado')
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}
