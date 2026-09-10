import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VARIANT = process.env.MCP_VARIANT || 'diagnostic';

const BINS = {
  diagnostic: path.join(__dirname, 'packages', 'diagnostic', 'bin', 'technitium-mcp-diagnostic.mjs'),
  full: path.join(__dirname, 'packages', 'full', 'bin', 'technitium-mcp-full.mjs'),
};

const bin = BINS[VARIANT];
if (!bin) {
  console.error(`Unknown MCP_VARIANT "${VARIANT}". Expected "diagnostic" or "full".`);
  process.exit(1);
}

const app = express();
const sessions = new Map();

app.get('/sse', async (req, res) => {
  const sse = new SSEServerTransport('/message', res);
  const stdio = new StdioClientTransport({
    command: 'node',
    args: [bin],
    env: process.env,
  });

  sessions.set(sse.sessionId, sse);

  sse.onmessage = (msg) => stdio.send(msg);
  stdio.onmessage = (msg) => sse.send(msg);

  sse.onclose = () => {
    sessions.delete(sse.sessionId);
    stdio.close();
  };

  await stdio.start();
  await sse.start();
});

app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId;
  const sse = sessions.get(sessionId);
  if (sse) {
    await sse.handlePostMessage(req, res);
  } else {
    res.status(404).end();
  }
});

const port = Number(process.env.MCP_PORT || 8000);
app.listen(port, '0.0.0.0', () =>
  console.log(`Technitium MCP SSE Proxy (${VARIANT}) listening on port ${port}`)
);
