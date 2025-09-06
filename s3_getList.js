const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
require("dotenv").config();

const getFiles = async () => {
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
  };

  // async/await
  try {
    const data = await client.send(new ListObjectsV2Command(params));
    const files = data.Contents.map((file) => file.Key);
    console.log(files);
  } catch (error) {
    console.log(error);
  }

  // callback
  //   client.send(new ListObjectsV2Command(params), (error, data) => {
  //     if (error) {
  //       console.log(error);
  //     } else {
  //       const files = data.Contents.map((file) => file.Key);
  //       console.log(files);
  //     }
  //   });
};

getFiles();
