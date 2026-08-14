import { readFileSync, statSync } from "node:fs";

export type McpMode = "analyse" | "full";

export interface Config {
  url: string;
  user: string;
  token?: string;
  password?: string;
  totp?: string;
  mode: McpMode;
  readonly: boolean;
  allowHttp: boolean;
}

export function loadConfig(): Config {
  const args = process.argv.slice(2);
  let modeFromArgs: McpMode | undefined;

  for (const arg of args) {
    if (
      arg === "--analyse" ||
      arg === "--analyze" ||
      arg === "--mode=analyse" ||
      arg === "--mode=analyze" ||
      arg === "--readonly"
    ) {
      modeFromArgs = "analyse";
    } else if (arg === "--full" || arg === "--mode=full" || arg === "--write") {
      modeFromArgs = "full";
    }
  }

  const envMode = (process.env.MCP_MODE || process.env.MCP_SERVER_MODE)?.toLowerCase();
  const url = process.env.TECHNITIUM_URL;
  if (!url) {
    throw new Error(
      "TECHNITIUM_URL environment variable is required (e.g. https://192.168.1.100:5380)"
    );
  }

  const cleanUrl = url.replace(/\/$/, "");
  const allowHttp = process.env.TECHNITIUM_ALLOW_HTTP === "true";
  let mode: McpMode = process.env.TECHNITIUM_READONLY === "true" ? "analyse" : "full";

  if (envMode === "analyse" || envMode === "analyze") {
    mode = "analyse";
  } else if (envMode === "full") {
    mode = "full";
  }

  if (modeFromArgs) {
    mode = modeFromArgs;
  }

  if (cleanUrl.startsWith("http://") && !allowHttp) {
    throw new Error(
      "TECHNITIUM_URL uses HTTP (insecure). Set TECHNITIUM_ALLOW_HTTP=true to override, or use HTTPS."
    );
  }

  if (cleanUrl.startsWith("http://") && allowHttp) {
    console.error(
      "[technitium-mcp] WARNING: Using HTTP - credentials transmitted in plaintext"
    );
  }

  // Token priority: env token > token file > password
  let token = process.env.TECHNITIUM_TOKEN;

  if (!token && process.env.TECHNITIUM_TOKEN_FILE) {
    const tokenFile = process.env.TECHNITIUM_TOKEN_FILE;
    try {
      const stat = statSync(tokenFile);
      const mode = stat.mode & 0o777;
      if (mode & 0o077) {
        console.error(
          `[technitium-mcp] WARNING: Token file ${tokenFile} has loose permissions (${mode.toString(8)}). Should be 0600.`
        );
      }
      token = readFileSync(tokenFile, "utf-8").trim();
    } catch (err) {
      throw new Error(`Cannot read token file: ${(err as Error).message}`);
    }
  }

  const password = process.env.TECHNITIUM_PASSWORD;
  const totp = process.env.TECHNITIUM_TOTP;
  const user = process.env.TECHNITIUM_USER || "admin";
  const readonly = mode === "analyse";

  if (!token && !password) {
    throw new Error(
      "Set TECHNITIUM_TOKEN, TECHNITIUM_TOKEN_FILE, or TECHNITIUM_PASSWORD"
    );
  }

  // Clear sensitive env vars from process
  delete process.env.TECHNITIUM_TOKEN;
  delete process.env.TECHNITIUM_TOKEN_FILE;
  delete process.env.TECHNITIUM_PASSWORD;
  delete process.env.TECHNITIUM_TOTP;

  return { url: cleanUrl, user, token, password, totp, mode, readonly, allowHttp };
}
