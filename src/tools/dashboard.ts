import { TechnitiumClient } from "../client.js";
import { ToolEntry } from "../types.js";
import { validatePeriod } from "../validate.js";

export function dashboardTools(client: TechnitiumClient): ToolEntry[] {
  return [
    {
      definition: {
        name: "dns_get_stats",
        description:
          "Get DNS query statistics for a time period. Returns total queries, cached, blocked, failure counts, plus top clients, top domains, and top blocked domains.",
        inputSchema: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: [
                "LastHour",
                "LastDay",
                "LastWeek",
                "LastMonth",
                "LastYear",
              ],
              description: "Time period for stats (default: LastDay)",
            },
          },
        },
      },
      readonly: true,
      handler: async (args) => {
        const period = args.period
          ? validatePeriod(args.period as string)
          : "LastDay";
        const data = await client.callOrThrow("/api/dashboard/stats/get", {
          type: period,
        });
        const stats = data.stats as Record<string, unknown>;
        const topClients = data.topClients as unknown[];
        const topDomains = data.topDomains as unknown[];
        const topBlocked = data.topBlockedDomains as unknown[];

        return JSON.stringify(
          { stats, topClients, topDomains, topBlockedDomains: topBlocked },
          null,
          2
        );
      },
    },
    {
      definition: {
        name: "dns_health_check",
        description:
          "Quick health check of the DNS server. Returns version, uptime, forwarder config, blocking status, and last hour failure rate.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const data = await client.callOrThrow("/api/dnsClient/healthCheck");
        return JSON.stringify(data, null, 2);
      },
    },
    {
      definition: {
        name: "dns_check_update",
        description:
          "Check if a newer version of Technitium DNS Server is available.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      readonly: true,
      handler: async () => {
        const data = await client.callOrThrow("/api/user/checkForUpdate");
        return JSON.stringify(data, null, 2);
      },
    },
  ];
}
