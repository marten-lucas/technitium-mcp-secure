import { TechnitiumClient } from "../client.js";
import { ToolEntry } from "../types.js";

export function userTools(client: TechnitiumClient): ToolEntry[] {
  return [
    {
      definition: {
        name: "get_user_status",
        description: "Get current user status and server version information.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const res = await client.callOrThrow("/api/user/status");
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "get_session_info",
        description: "Get details for the current active user session.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const res = await client.callOrThrow("/api/user/getSessionInfo");
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "get_profile_details",
        description: "Get user profile details for the authenticated session.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const res = await client.callOrThrow("/api/user/getProfileDetails");
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "set_profile_details",
        description: "Update profile details for the authenticated user.",
        inputSchema: {
          type: "object",
          properties: {
            displayName: { type: "string", description: "User display name" },
            email: { type: "string", description: "User email address" },
          },
        },
      },
      readonly: false,
      handler: async (args) => {
        const params: Record<string, string> = {};
        if (args.displayName) params.displayName = String(args.displayName);
        if (args.email) params.email = String(args.email);
        const res = await client.callOrThrow("/api/user/setProfileDetails", params);
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "check_for_update",
        description: "Check if a new version of Technitium DNS Server is available.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const res = await client.callOrThrow("/api/user/checkForUpdate");
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
  ];
}
