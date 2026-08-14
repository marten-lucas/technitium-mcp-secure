import { TechnitiumClient } from "../client.js";
import { ToolEntry } from "../types.js";

function buildParams(args: Record<string, unknown>, keys: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of keys) {
    const value = args[key];
    if (value !== undefined) {
      params[key] = String(value);
    }
  }
  return params;
}

export function userTools(client: TechnitiumClient): ToolEntry[] {
  return [
    {
      definition: {
        name: "get_user_status",
        description: "Get current user status and server version information.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: true,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/status"), null, 2),
    },
    {
      definition: {
        name: "get_session_info",
        description: "Get details for the current active user session.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: true,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/session/get"), null, 2),
    },
    {
      definition: {
        name: "get_profile_details",
        description: "Get user profile details for the authenticated session.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: true,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/profile/get"), null, 2),
    },
    {
      definition: {
        name: "set_profile_details",
        description: "Update profile details for the authenticated user.",
        inputSchema: {
          type: "object",
          properties: {
            displayName: { type: "string", description: "User display name" },
            sessionTimeoutSeconds: {
              type: "number",
              description: "Session timeout in seconds",
            },
          },
        },
      },
      readonly: false,
      handler: async (args) => {
        const params = buildParams(args, ["displayName", "sessionTimeoutSeconds"]);
        const res = await client.callOrThrow("/api/user/profile/set", params);
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "create_user_api_token",
        description: "Create a new API token for the current user.",
        inputSchema: {
          type: "object",
          properties: {
            tokenName: { type: "string", description: "Name/label for the API token" },
          },
          required: ["tokenName"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/user/createToken", {
          tokenName: String(args.tokenName),
        });
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "create_single_use_user_token",
        description: "Create a single-use API token for the current user.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: false,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/createSingleUseToken"), null, 2),
    },
    {
      definition: {
        name: "logout_user_session",
        description: "Logout the current session or token.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: false,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/logout"), null, 2),
    },
    {
      definition: {
        name: "delete_user_session",
        description: "Delete a specific user session by partial token.",
        inputSchema: {
          type: "object",
          properties: {
            partialToken: {
              type: "string",
              description: "Partial token as returned by profile details",
            },
          },
          required: ["partialToken"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/user/session/delete", {
          partialToken: String(args.partialToken),
        });
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "change_password",
        description: "Change the password for the current logged in user.",
        inputSchema: {
          type: "object",
          properties: {
            currentPassword: { type: "string", description: "Current password" },
            newPassword: { type: "string", description: "New password" },
            totp: { type: "string", description: "6-digit TOTP code if 2FA is enabled" },
            iterations: { type: "number", description: "PBKDF2 iterations" },
          },
          required: ["currentPassword", "newPassword"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const params: Record<string, string> = {};
        if (args.currentPassword !== undefined) params.pass = String(args.currentPassword);
        if (args.newPassword !== undefined) params.newPass = String(args.newPassword);
        if (args.totp !== undefined) params.totp = String(args.totp);
        if (args.iterations !== undefined) params.iterations = String(args.iterations);
        const res = await client.callOrThrow("/api/user/changePassword", params);
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "initialize_2fa",
        description: "Initialize two-factor authentication for the current user.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: false,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/2fa/init"), null, 2),
    },
    {
      definition: {
        name: "enable_2fa",
        description: "Enable two-factor authentication for the current user.",
        inputSchema: {
          type: "object",
          properties: {
            totp: { type: "string", description: "6-digit code from authenticator app" },
          },
          required: ["totp"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/user/2fa/enable", { totp: String(args.totp) });
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "disable_2fa",
        description: "Disable two-factor authentication for the current user.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: false,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/2fa/disable"), null, 2),
    },
    {
      definition: {
        name: "check_for_update",
        description: "Check if a new version of Technitium DNS Server is available.",
        inputSchema: { type: "object", properties: {} },
      },
      readonly: true,
      handler: async () => JSON.stringify(await client.callOrThrow("/api/user/checkForUpdate"), null, 2),
    },
  ];
}
