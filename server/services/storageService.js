"use strict";

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { Readable } = require("stream");

const s3 = new S3Client({
  region: "default",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE || false,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const bucket = process.env.S3_BUCKET || "zkflow-dev";

async function putObject(key, body, contentType = "application/octet-stream") {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return { bucket, key };
}

async function getObjectStream(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return res.Body;
}

function stringToStream(str) {
  return Readable.from([str]);
}

module.exports = { putObject, getObjectStream, stringToStream };
