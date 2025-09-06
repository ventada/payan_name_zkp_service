"use strict";

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

async function generateCircuitFile(templateName, params) {
  const templatePath = path.join(
    process.cwd(),
    "templates",
    `${templateName}.template.circom`
  );
  let content = await fs.readFile(templatePath, "utf8");
  Object.entries(params).forEach(([key, value]) => {
    content = content.replace(
      new RegExp(`{{\\s*${key}\\s*}}`, "g"),
      String(value)
    );
  });

  const uniqueId = crypto.randomBytes(12).toString("hex");
  const processingDir = path.join(process.cwd(), "processing", uniqueId);
  await fs.mkdir(processingDir, { recursive: true });
  const fileName = `${templateName}_${uniqueId}.circom`;
  const outputPath = path.join(processingDir, fileName);
  await fs.writeFile(outputPath, content, "utf8");
  return { outputPath, processingDir, uniqueId };
}

module.exports = { generateCircuitFile };
