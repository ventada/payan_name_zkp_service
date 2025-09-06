"use strict";

require("dotenv").config();
const { getContractInfo } = require("../server/services/deploymentService");

async function checkContractInfo() {
  const circuitId = process.argv[2];

  if (!circuitId) {
    console.log("Usage: node tools/checkContractInfo.js <circuitId>");
    process.exit(1);
  }

  try {
    console.log(`Checking contract info for circuit: ${circuitId}`);
    console.log("CONTRACT_DEPLOY_URL:", process.env.CONTRACT_DEPLOY_URL);

    const contractInfo = await getContractInfo(circuitId);

    console.log("\n=== Contract Info Response ===");
    console.log(JSON.stringify(contractInfo, null, 2));

    console.log("\n=== Analysis ===");
    console.log("Success:", contractInfo.success);
    console.log("Status:", contractInfo.data?.status);
    console.log("Contract Address:", contractInfo.data?.contractAddress);
    console.log("TX Hash:", contractInfo.data?.txHash);
    console.log("Deployed At:", contractInfo.data?.deployedAt);

    if (
      contractInfo.data?.status === "deployed" &&
      contractInfo.data?.contractAddress
    ) {
      console.log("✅ Contract is fully deployed and ready");
    } else {
      console.log("❌ Contract deployment not complete or missing info");
      console.log(
        "- Status should be 'deployed', got:",
        contractInfo.data?.status
      );
      console.log(
        "- contractAddress should be present, got:",
        contractInfo.data?.contractAddress
      );
    }
  } catch (error) {
    console.error("Error getting contract info:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

checkContractInfo();
