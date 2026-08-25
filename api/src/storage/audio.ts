import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MAX_AUDIO_BYTES } from '@vocali/contracts'

const s3 = new S3Client()

function bucket() {
  if (!process.env.AUDIO_BUCKET) throw new Error('AUDIO_BUCKET is not configured')
  return process.env.AUDIO_BUCKET
}

function key(userId: string, id: string) {
  return `${userId}/${id}`
}

export async function createAudioUpload(userId: string, id: string, contentType: string) {
  return createPresignedPost(s3, {
    Bucket: bucket(),
    Key: key(userId, id),
    Fields: { 'Content-Type': contentType },
    Conditions: [
      ['eq', '$Content-Type', contentType],
      ['content-length-range', 1, MAX_AUDIO_BYTES]
    ],
    Expires: 300
  })
}

export async function assertAudioExists(userId: string, id: string) {
  await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: key(userId, id) }))
}

export async function createAudioReadUrl(
  userId: string,
  id: string,
  expiresIn: number,
  downloadName?: string
) {
  const fileName = downloadName
    ? encodeURIComponent(downloadName).replaceAll("'", '%27')
    : undefined
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: bucket(),
    Key: key(userId, id),
    ...(fileName
      ? { ResponseContentDisposition: `attachment; filename="audio"; filename*=UTF-8''${fileName}` }
      : {})
  }), { expiresIn })
}
