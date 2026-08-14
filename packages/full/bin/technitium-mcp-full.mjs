#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../");
const serverEntrypoint = path.join(rootDir, "dist", "index.js");

const args = process.argv.slice(2);
const hasModeArg = args.some((arg) =>
  arg === "--full" || arg === "--mode=full" || arg === "--write"
);

const finalArgs = hasModeArg ? args : ["--mode=full", ...args];
const child = spawn(process.execPath, [serverEntrypoint, ...finalArgs], {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

