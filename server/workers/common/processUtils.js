"use strict";

const { spawn } = require("child_process");

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    // Use shell: true on Windows to ensure PATH is available
    const isWindows = process.platform === "win32";
    
    // Ensure PATH includes cargo bin for circom on Windows
    const env = { ...process.env };
    if (isWindows && !env.PATH.includes('.cargo/bin')) {
      env.PATH = `${process.env.HOME}/.cargo/bin:${env.PATH}`;
    }
    
    const child = spawn(command, args, {
      shell: isWindows,
      env,
      ...options,
    });
    child.stdout.on("data", (d) => process.stdout.write(d));
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => {
      if (code !== 0)
        return reject(
          new Error(`${command} ${args.join(" ")} exited with ${code}`)
        );
      resolve();
    });
    child.on("error", reject);
  });
}

module.exports = { runCommand };
