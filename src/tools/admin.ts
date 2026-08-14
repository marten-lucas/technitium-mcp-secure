import { TechnitiumClient } from "../client.js";
import { ToolEntry } from "../types.js";

export function adminTools(client: TechnitiumClient): ToolEntry[] {
  return [
    // Session Management
    {
      definition: {
        name: "list_admin_sessions",
        description: "List active user sessions and API tokens on the DNS server.",
        inputSchema: {
          type: "object",
          properties: {
            node: { type: "string", description: "Node domain name when using clustering" },
          },
        },
      },
      readonly: true,
      handler: async (args) => {
        const params: Record<string, string> = {};
        if (args.node) params.node = String(args.node);
        const res = await client.callOrThrow("/api/admin/sessions/list", params);
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "create_admin_api_token",
        description: "Create a persistent API token for a user account.",
        inputSchema: {
          type: "object",
          properties: {
            user: { type: "string", description: "Username for which to generate token" },
            tokenName: { type: "string", description: "Name/identifier for the token" },
          },
          required: ["user", "tokenName"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/admin/sessions/createToken", {
          user: String(args.user),
          tokenName: String(args.tokenName),
        });
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "delete_admin_session",
        description: "Delete/terminate an active user session or API token.",
        inputSchema: {
          type: "object",
          properties: {
            user: { type: "string", description: "Username" },
            tokenName: { type: "string", description: "Token name to delete" },
          },
          required: ["user"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const params: Record<string, string> = { user: String(args.user) };
        if (args.tokenName) params.tokenName = String(args.tokenName);
        const res = await client.callOrThrow("/api/admin/sessions/delete", params);
        return JSON.stringify(res, null, 2);
      },
    },

    // User Management
    {
      definition: {
        name: "list_users",
        description: "List all registered users on the DNS server.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const res = await client.callOrThrow("/api/admin/users/list");
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "create_user",
        description: "Create a new user account.",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "New username" },
            password: { type: "string", description: "User password" },
            memberOfGroups: { type: "string", description: "Comma-separated group names" },
          },
          required: ["username", "password"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const params: Record<string, string> = {
          username: String(args.username),
          password: String(args.password),
        };
        if (args.memberOfGroups) params.memberOfGroups = String(args.memberOfGroups);
        const res = await client.callOrThrow("/api/admin/users/create", params);
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "get_user_details",
        description: "Get profile details and permissions for a specific user.",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Username to inspect" },
          },
          required: ["username"],
        },
      },
      readonly: true,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/admin/users/get", {
          username: String(args.username),
        });
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "delete_user",
        description: "Delete a user account.",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Username to delete" },
          },
          required: ["username"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/admin/users/delete", {
          username: String(args.username),
        });
        return JSON.stringify(res, null, 2);
      },
    },

    // Group Management
    {
      definition: {
        name: "list_groups",
        description: "List all user groups on the server.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const res = await client.callOrThrow("/api/admin/groups/list");
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "create_group",
        description: "Create a new user group.",
        inputSchema: {
          type: "object",
          properties: {
            groupName: { type: "string", description: "Name of the group" },
            description: { type: "string", description: "Optional group description" },
          },
          required: ["groupName"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const params: Record<string, string> = { groupName: String(args.groupName) };
        if (args.description) params.description = String(args.description);
        const res = await client.callOrThrow("/api/admin/groups/create", params);
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "delete_group",
        description: "Delete a user group.",
        inputSchema: {
          type: "object",
          properties: {
            groupName: { type: "string", description: "Name of the group to delete" },
          },
          required: ["groupName"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/admin/groups/delete", {
          groupName: String(args.groupName),
        });
        return JSON.stringify(res, null, 2);
      },
    },

    // Cluster Management
    {
      definition: {
        name: "get_cluster_state",
        description: "Get the current cluster status and secondary nodes info.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const res = await client.callOrThrow("/api/admin/cluster/getState");
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "initialize_cluster",
        description: "Initialize clustering on this Technitium DNS server primary node.",
        inputSchema: {
          type: "object",
          properties: {
            clusterDomain: { type: "string", description: "Cluster domain name" },
            clusterSecret: { type: "string", description: "Shared secret key for cluster communication" },
          },
          required: ["clusterDomain", "clusterSecret"],
        },
      },
      readonly: false,
      handler: async (args) => {
        const res = await client.callOrThrow("/api/admin/cluster/initialize", {
          clusterDomain: String(args.clusterDomain),
          clusterSecret: String(args.clusterSecret),
        });
        return JSON.stringify(res, null, 2);
      },
    },
    {
      definition: {
        name: "resync_cluster",
        description: "Trigger configuration resynchronization across cluster nodes.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: false,
      handler: async () => {
        const res = await client.callOrThrow("/api/admin/cluster/resync");
        return JSON.stringify(res, null, 2);
      },
    },
  ];
}
