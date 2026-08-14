import { Config } from "./config.js";
import { TechnitiumResponse } from "./types.js";
import { audit } from "./audit.js";

export class TechnitiumClient {
  private sessionToken: string | null = null;
  private config: Config;
  private authInFlight: Promise<void> | null = null;

  constructor(config: Config) {
    this.config = config;
    if (config.token) {
      this.sessionToken = config.token;
    }
  }

  private async authenticate(): Promise<void> {
    if (this.config.token) {
      this.sessionToken = this.config.token;
      audit.logAuth("token_loaded", true);
      return;
    }

    if (!this.config.password) {
      throw new Error("Technitium DNS Server authentication required. Set TECHNITIUM_TOKEN or TECHNITIUM_PASSWORD in environment.");
    }

    const body = new URLSearchParams({
      user: this.config.user,
      pass: this.config.password,
    });
    if (this.config.totp) {
      body.set("totp", this.config.totp);
    }

    try {
      const resp = await fetch(`${this.config.url}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data = (await resp.json()) as TechnitiumResponse;

      if (data.status === "2fa-required") {
        throw new Error("Two-factor authentication required. Set TECHNITIUM_TOTP.");
      }
      if (data.status !== "ok" || !data.response) {
        audit.logAuth("login", false, data.errorMessage);
        throw new Error(data.errorMessage || "Authentication failed");
      }

      this.sessionToken = data.response.token as string;
      audit.logAuth("login", true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      audit.logAuth("login", false, msg);
      throw new Error(`Failed to connect to Technitium DNS Server at ${this.config.url}: ${msg}`);
    }
  }

  private async ensureAuth(): Promise<void> {
    if (this.sessionToken) return;

    // Mutex: if auth is already in-flight, wait for it
    if (this.authInFlight) {
      await this.authInFlight;
      return;
    }

    this.authInFlight = this.authenticate().finally(() => {
      this.authInFlight = null;
    });
    await this.authInFlight;
  }

  async call(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<TechnitiumResponse> {
    await this.ensureAuth();

    const result = await this.doCall(endpoint, params);

    if (result.status === "invalid-token") {
      this.sessionToken = null;
      audit.logAuth("token_expired", false);
      await this.ensureAuth();
      return this.doCall(endpoint, params);
    }

    return result;
  }

  private async doCall(
    endpoint: string,
    params: Record<string, string>
  ): Promise<TechnitiumResponse> {
    const token = this.sessionToken || "";
    const body = new URLSearchParams({
      ...params,
      token,
    });

    try {
      const resp = await fetch(`${this.config.url}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: body.toString(),
      });

      return (await resp.json()) as TechnitiumResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "error",
        errorMessage: `Network error connecting to ${this.config.url}${endpoint}: ${msg}`,
      };
    }
  }

  async callOrThrow(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<Record<string, unknown>> {
    const result = await this.call(endpoint, params);

    if (result.status !== "ok") {
      throw new Error(
        result.errorMessage || `API error: ${result.status}`
      );
    }

    return result.response || {};
  }

  async callRawText(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<string> {
    await this.ensureAuth();
    const token = this.sessionToken!;

    const body = new URLSearchParams({
      ...params,
      token,
    });

    const resp = await fetch(`${this.config.url}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: body.toString(),
    });

    const text = await resp.text();

    // Check if it's actually a JSON error response
    try {
      const json = JSON.parse(text) as TechnitiumResponse;
      if (json.status === "invalid-token") {
        this.sessionToken = null;
        audit.logAuth("token_expired", false);
        await this.ensureAuth();
        const retryBody = new URLSearchParams({
          ...params,
          token: this.sessionToken!,
        });
        const retryResp = await fetch(`${this.config.url}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${this.sessionToken!}`,
          },
          body: retryBody.toString(),
        });
        return retryResp.text();
      }
      if (json.status !== "ok") {
        throw new Error(json.errorMessage || `API error: ${json.status}`);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // Not JSON — this is the raw text response we want
        return text;
      }
      throw e;
    }

    return text;
  }

  async callRawTextGet(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<string> {
    await this.ensureAuth();
    const token = this.sessionToken!;

    const qs = new URLSearchParams({
      ...params,
      token,
    });

    const resp = await fetch(`${this.config.url}${endpoint}?${qs.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await resp.text();

    try {
      const json = JSON.parse(text) as TechnitiumResponse;
      if (json.status === "invalid-token") {
        this.sessionToken = null;
        audit.logAuth("token_expired", false);
        await this.ensureAuth();
        const retryQs = new URLSearchParams({
          ...params,
          token: this.sessionToken!,
        });
        const retryResp = await fetch(
          `${this.config.url}${endpoint}?${retryQs.toString()}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${this.sessionToken!}` },
          }
        );
        return retryResp.text();
      }
      if (json.status !== "ok") {
        throw new Error(json.errorMessage || `API error: ${json.status}`);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        return text;
      }
      throw e;
    }

    return text;
  }

  clearToken(): void {
    this.sessionToken = null;
  }
}
