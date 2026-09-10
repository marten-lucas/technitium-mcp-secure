# technitium-mcp-secure

A security-hardened [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for managing [Technitium DNS Server](https://technitium.com/dns/) via its HTTP API.

Built for use with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and other MCP-compatible clients.

## Features

- **52 tools** covering DNS zones, records, blocking, cache, settings, apps, DNSSEC, logs, diagnostics, and user management
- **Input validation** on all parameters (RFC 1035 domain checks, IP validation, enum allowlists)
- **HTTPS enforcement** with explicit HTTP opt-in for local networks
- **Read-only mode** to expose only safe query tools
- **Confirmation required** for destructive operations (delete zone, delete record, flush cache/allow/block, uninstall app)
- **Rate limiting** with stricter limits on destructive operations
- **Audit logging** as structured JSONL to stderr
- **Response sanitization** to strip tokens, passwords, stack traces, and sensitive paths
- **Error sanitization** to prevent credential/path leakage in error messages
- **Token file support** for secure credential storage
- **Auth mutex** to prevent concurrent authentication races
- **POST-only API calls** for all mutating operations; zone export uses GET (required by Technitium API) with short-lived session tokens

## Monorepo Layout

- `packages/diagnostic`: dedicated diagnostic (read-only) variant wrapper
- `packages/full`: dedicated full-management variant wrapper
- root `src/`: shared secure MCP runtime used by both variants

## Quick Start

```bash
# Clone and build
git clone https://github.com/marten-lucas/technitium-mcp-secure.git
cd technitium-mcp-secure
npm install
npm run build

# Run dedicated variants
npm run variant:diagnostic
npm run variant:full

# Register with Claude Code (see "Generating an API Token" below first)
claude mcp add technitium-dns \
  --env TECHNITIUM_URL=https://your-server-ip:5380 \
  --env TECHNITIUM_TOKEN=your-api-token \
  -- node /path/to/technitium-mcp-secure/packages/full/bin/technitium-mcp-full.mjs
```

## Docker / SSE deployment

A prebuilt image is published to `ghcr.io/marten-lucas/technitium-mcp-secure`.
It runs the MCP server over **SSE** (HTTP) so remote agents (e.g. Hermes) can
connect without a local stdio process.

The image contains a small `server.mjs` bridge that spawns the correct variant
bin (stdio) and exposes it via `SSEServerTransport` on port `8000`:

- `GET /sse` — the SSE endpoint (MCP client connects here)
- `POST /message` — the message channel for the SSE session

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MCP_VARIANT` | Yes | `diagnostic` (read-only) or `full` |
| `TECHNITIUM_URL` | Yes | Server URL (e.g. `https://192.168.1.100:5380`) |
| `TECHNITIUM_TOKEN` | One of token/password | API token (preferred) |
| `MCP_PORT` | No | Listen port (default `8000`) |

Plus the same connection variables listed under
[Configuration](#configuration) below (`TECHNITIUM_ALLOW_HTTP`, etc.).

### Example

```bash
docker run -p 8000:8000 \
  -e MCP_VARIANT=diagnostic \
  -e TECHNITIUM_URL=https://dns.example.com \
  -e TECHNITIUM_TOKEN=your-api-token \
  ghcr.io/marten-lucas/technitium-mcp-secure:latest
```

```yaml
# Coolify / Docker Compose
services:
  technitium-diag-mcp:
    image: ghcr.io/marten-lucas/technitium-mcp-secure:latest
    environment:
      - MCP_VARIANT=diagnostic
      - TECHNITIUM_URL=${TECHNITIUM_URL}
      - TECHNITIUM_TOKEN=${TECHNITIUM_TOKEN}
```

## Configuration

All configuration is via environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `TECHNITIUM_URL` | Yes | Server URL (e.g. `https://192.168.1.100:5380`) |
| `TECHNITIUM_TOKEN` | One of token/password | API token (preferred) |
| `TECHNITIUM_TOKEN_FILE` | One of token/password | Path to file containing token (must be mode 0600) |
| `TECHNITIUM_PASSWORD` | One of token/password | Admin password (token is preferred) |
| `TECHNITIUM_TOTP` | No | TOTP code for 2FA-enabled logins |
| `TECHNITIUM_USER` | No | Username (default: `admin`) |
| `TECHNITIUM_READONLY` | No | Set `true` to hide all write tools |
| `TECHNITIUM_ALLOW_HTTP` | No | Set `true` to allow insecure HTTP connections |

Authentication priority: `TECHNITIUM_TOKEN` > `TECHNITIUM_TOKEN_FILE` > `TECHNITIUM_PASSWORD`

Sensitive environment variables are cleared from `process.env` after being read.

CLI mode flags are also supported:

- `--analyse` / `--analyze` / `--mode=analyse` / `--mode=analyze` / `--readonly`
- `--full` / `--mode=full` / `--write`

## Tools

### Read-only (22 tools)

| Tool | Description |
|------|-------------|
| `dns_health_check` | Server version, uptime, forwarder config, failure rate |
| `dns_get_stats` | Query statistics with top clients/domains/blocked |
| `dns_check_update` | Check if a newer server version is available |
| `dns_resolve` | Test DNS resolution via the server |
| `dns_list_zones` | List all configured zones |
| `dns_zone_options` | Zone DNSSEC, transfer, and notify settings |
| `dns_export_zone` | Export a zone file in BIND format |
| `dns_list_records` | List records in a zone |
| `dns_list_blocked` | List blocked domains (hierarchical, supports drill-down) |
| `dns_list_allowed` | List allowed domains (hierarchical, supports drill-down) |
| `dns_list_cache` | List cached zones (hierarchical, supports drill-down) |
| `dns_get_settings` | Full server settings |
| `dns_query_logs` | Query DNS logs with filters |
| `dns_list_apps` | List installed DNS apps |
| `dns_list_app_store` | List available apps from the Technitium app store |
| `dns_get_app_config` | Get configuration for an installed app |
| `dns_dnssec_info` | DNSSEC properties for a zone |
| `dns_get_ds` | DS records for a DNSSEC-signed zone |
| `get_user_status` | Current user status and server version |
| `get_session_info` | Current active session details |
| `get_profile_details` | Authenticated user profile details |
| `check_for_update` | Check if a new Technitium version is available |

### Write (28 tools)

| Tool | Description |
|------|-------------|
| `dns_create_zone` | Create a new DNS zone |
| `dns_delete_zone` | Delete a zone (requires `confirm: true`) |
| `dns_enable_zone` | Enable a disabled zone |
| `dns_disable_zone` | Disable a zone (preserves records) |
| `dns_set_zone_options` | Update zone configuration (notify, transfer ACLs) |
| `dns_add_record` | Add a DNS record |
| `dns_update_record` | Update an existing record |
| `dns_delete_record` | Delete a record (requires `confirm: true`) |
| `dns_block_domain` | Block a domain |
| `dns_remove_blocked` | Remove a domain from the block list |
| `dns_flush_blocked` | Flush entire custom block list (requires `confirm: true`) |
| `dns_allow_domain` | Allow a domain (bypass block lists) |
| `dns_remove_allowed` | Remove a domain from the allow list |
| `dns_flush_allowed` | Flush entire allow list (requires `confirm: true`) |
| `dns_flush_cache` | Flush DNS cache (requires `confirm: true`) |
| `dns_delete_cached` | Delete a specific domain from cache |
| `dns_set_settings` | Update server settings (forwarders, blocking, etc.) |
| `dns_install_app` | Install a DNS app from the app store |
| `dns_uninstall_app` | Uninstall an app (requires `confirm: true`) |
| `set_profile_details` | Update the authenticated user's profile |
| `create_user_api_token` | Create a new API token for the current user |
| `create_single_use_user_token` | Create a single-use API token |
| `logout_user_session` | Logout the current session or token |
| `delete_user_session` | Delete a session by partial token |
| `change_password` | Change the current user's password |
| `initialize_2fa` | Initialize 2FA for the current user |
| `enable_2fa` | Enable 2FA for the current user |
| `disable_2fa` | Disable 2FA for the current user |

## Security

### Generating an API Token

An API token is the recommended way to authenticate. Tokens avoid sending your admin password on every request and can be revoked independently.

**Option A: Web Admin UI**

1. Open the Technitium web admin (e.g. `http://your-server-ip:5380`)
2. Log in with your admin credentials
3. Go to **Administration** (gear icon, top right)
4. Scroll down to **Sessions**
5. Under **Create API Token**, enter a name (e.g. `mcp-server`)
6. Click **Create**
7. Copy the token value shown - this is the only time it will be displayed

**Option B: API (curl)**

```bash
# Login first to get a session token
curl -s -X POST 'http://your-server-ip:5380/api/user/login' \
  -d 'user=admin&pass=yourpassword' | jq -r '.response.token'

# Then create a non-expiring API token using the session token
curl -s -X POST 'http://your-server-ip:5380/api/user/createToken' \
  -d 'user=admin&pass=yourpassword&tokenName=mcp-server' | jq -r '.response.token'
```

**Storing the token securely:**

```bash
# Option 1: Pass directly as env var (simplest)
claude mcp add technitium-dns \
  --env TECHNITIUM_TOKEN=your-token-here ...

# Option 2: Use a token file (more secure - keeps token out of shell history)
echo "your-token-here" > ~/.technitium-token
chmod 600 ~/.technitium-token

claude mcp add technitium-dns \
  --env TECHNITIUM_TOKEN_FILE=~/.technitium-token ...
```

### Local Network (HTTP)

If your Technitium server doesn't have TLS configured (common for LAN-only setups), you need to explicitly allow HTTP:

```bash
claude mcp add technitium-dns \
  --env TECHNITIUM_URL=http://your-server-ip:5380 \
  --env TECHNITIUM_TOKEN=your-token \
  --env TECHNITIUM_ALLOW_HTTP=true \
  -- node /path/to/technitium-mcp-secure/packages/full/bin/technitium-mcp-full.mjs
```

A warning will be logged to stderr reminding you that credentials are sent in plaintext.

### Read-only Mode

For monitoring-only use cases, hide all write tools:

```bash
claude mcp add technitium-dns-readonly \
  --env TECHNITIUM_URL=http://your-server-ip:5380 \
  --env TECHNITIUM_TOKEN=your-token \
  --env TECHNITIUM_READONLY=true \
  --env TECHNITIUM_ALLOW_HTTP=true \
  -- node /path/to/technitium-mcp-secure/packages/diagnostic/bin/technitium-mcp-diagnostic.mjs
```

### Rate Limits

- Global: 100 requests/minute
- Create/mutate operations: 10/minute
- Delete/flush operations: 5/minute

### Audit Log

All tool calls are logged as JSONL to stderr with timestamps, tool name, sanitized arguments, result status, and duration. Sensitive values (tokens, passwords) are redacted before logging.

## Scope and Intent

This secure MCP server focuses on the API surfaces that are most relevant to safe, operational DNS administration in an MCP environment:

- DNS zones, records, and zone-level configuration
- Blocking, allowlisting, cache management, and diagnostics
- DNSSEC and app-management flows supported by the official v14 API
- User/session/profile management and 2FA flows
- Settings and diagnostics needed for day-to-day server operations

The project intentionally does not expose every legacy or niche admin endpoint. Instead, it keeps the tool surface aligned with the supported Technitium API and the needs of a secure MCP runtime.

## Compatibility

Tested against **Technitium DNS Server v14.3** on Alpine Linux. The currently exposed API paths were verified against the live v14 API.

**Note:** Technitium's API paths changed between versions. If you see 404 errors, check that your server version is v14+. Earlier versions used different paths (e.g. `/api/allowedZones/list` instead of `/api/allowed/list`).

## Requirements

- Node.js >= 18
- Technitium DNS Server v14+

## Changelog

### v1.2.0
- Add 19 new tools (39 total): remove/flush allowed & blocked, delete cached, enable/disable/configure/export zones, server settings management, temporary blocking disable, block list updates, app store/install/uninstall/config, DNSSEC info, update check
- All 36 API endpoints verified returning 200 against live Technitium v14.3
- Add "Not Yet Implemented" section documenting available API categories

### v1.1.1
- Fix `dns_resolve` missing required `server` parameter (now defaults to `this-server`)
- Fix `dns_query_logs` missing `name` and `classPath` params for Query Logs (Sqlite) app
- Fix `dns_list_allowed`, `dns_allow_domain` using wrong API path (`/api/allowedZones/*` -> `/api/allowed/*`)
- Fix `dns_list_blocked`, `dns_block_domain` using wrong API path (`/api/blockedZones/*` -> `/api/blocked/*`)
- Fix `dns_list_cache` using wrong API path (`/api/cache/zones/list` -> `/api/cache/list`)
- Fix `dns_allow_domain`, `dns_block_domain` using wrong param name (`zone` -> `domain`)
- All 17 API endpoints verified returning 200 against live Technitium v14.3

### v1.1.0
- Security hardening: input validation, audit logging, rate limiting, response sanitization
- HTTPS enforcement with HTTP opt-in, read-only mode, confirmation for destructive ops
- Token file support, auth mutex, POST-only API calls, env var clearing

### v1.0.0
- Initial release with 20 tools for DNS management

## License

MIT
