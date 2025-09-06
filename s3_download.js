const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const downloadFile = async () => {
  const client = new S3Client({
    region: "default",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: "circuits/68ba918be6990524daeb67cb/verifier.sol",
  };

  // async/await
  try {
    const data = await client.send(new GetObjectCommand(params));
    console.log("downloaded file", data);

    // Convert the readable stream to a buffer
    const chunks = [];
    for await (const chunk of data.Body) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    // Create the output directory if it doesn't exist
    const outputDir = path.dirname(params.Key);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the file
    fs.writeFileSync(params.Key, fileBuffer);
    console.log(`File saved successfully to: ${params.Key}`);
  } catch (error) {
    console.log("error", error);
  }
};

downloadFile();
