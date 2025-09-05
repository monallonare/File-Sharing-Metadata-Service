import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({});
const BUCKET = process.env.UPLOAD_BUCKET;

export const handler = async (event) => {
  // API Gateway proxy: body is JSON string
  const body = event.body ? JSON.parse(event.body) : {};
  const filename = body.filename || 'upload.bin';
  const contentType = body.contentType || 'application/octet-stream';
  const key = `uploads/${Date.now()}-${uuidv4()}-${filename}`;
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, key })
  };
};
