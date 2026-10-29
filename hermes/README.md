# Sai by Simular for Hermes

Give Hermes a computer. This package lets Hermes hand tasks to
[Sai](https://platform.simular.ai), Simular's computer-use agent. Sai uses apps
and websites the way a person does, by seeing the screen, clicking and typing,
so Hermes can get work done where there is no API: web apps behind a login,
admin consoles, desktop software, forms with no import. Sai runs on a cloud
computer Simular hosts; the free plan includes one.

It is an Agent Plugins v1 package (`plugin.json`, `mcp.json`, `skills/`) with
no code of its own.

## Install

1. Sign in at [platform.simular.ai](https://platform.simular.ai) and create an
   API key under [API Keys](https://platform.simular.ai/api-keys).
2. Put the key in your Hermes profile's `.env` (or your shell) as
   `SAI_API_KEY=sapi_...`.
3. Install and enable the plugin:

   ```bash
   hermes plugins install simular-sai --no-enable
   hermes plugins enable simular-sai
   ```

Requires Node.js 22.12 or later and npm, because the MCP server runs through
`npx`.

Then ask Hermes something like: "Use Sai to open Notepad on my cloud computer,
type Hello from Sai, and tell me the window title."

## What it contains

- **MCP server** `sai`: the open-source
  [`@simular-ai/sai-mcp`](https://www.npmjs.com/package/@simular-ai/sai-mcp)
  package, pinned to `0.4.0` and started with `npx`. Tools: start a task, wait
  for it, answer permission requests, stop it, upload a file, list computers
  and models, and hand the screen to a person with a link.
- **Skill** `simular-sai:sai`: tells Hermes when to hand a task to Sai and how
  to run it to the end, including permission requests and sign-in links.

## Data and network

- `npx` downloads `@simular-ai/sai-mcp@0.4.0` and its dependencies from the
  npm registry on first start.
- The MCP server sends your tasks, the files you ask it to upload and your API
  key to the Sai API at `https://api.simular.ai`, which runs the task on your
  Sai cloud computer and returns its text result. Tasks use your Sai account's
  credit or the free plan's daily computer time.
- It serves a live view of the task on `127.0.0.1` on your own computer,
  linked as `watch_url`. Your API key never reaches the browser.
- `sai_live_link` returns a link that lets anyone who has it use your cloud
  computer until it expires. The skill tells the agent to give it only to you.
- The package stores nothing itself and has no hooks, background processes or
  telemetry.

Privacy policy: [simular.ai/product-sai/privacy](https://www.simular.ai/product-sai/privacy).
Support: [support@simular.ai](mailto:support@simular.ai).
