# Sai for Claude Code

Give Claude a computer. This plugin lets Claude Code hand tasks to
[Sai](https://platform.simular.ai), Simular's computer-use agent, #1 on
OSWorld 2.0. Sai uses apps and websites the way a person does, by seeing the
screen, clicking and typing, so Claude can get work done where there is no
API: web apps behind a login, admin consoles, desktop software, forms with no
import. Sai runs on a cloud computer Simular hosts; the free plan includes one.

## Install

1. Sign in at [platform.simular.ai](https://platform.simular.ai) and create an
   API key under [API Keys](https://platform.simular.ai/api-keys).
2. Install the plugin from `/plugin` in Claude Code. When asked, paste the API
   key. It is stored in Claude Code's secure storage, not in a settings file.

Then ask Claude something like: "Use Sai to open Notepad on my cloud computer,
type Hello from Sai, and tell me the window title."

## What it contains

- **MCP server** `sai`: the open-source
  [`@simular-ai/sai-mcp`](https://www.npmjs.com/package/@simular-ai/sai-mcp)
  package, pinned to an exact version and started with `npx`. Tools: start a
  task, wait for it, answer permission requests, stop it, upload a file, list
  computers and models.
- **Skill** `sai`: tells Claude when to hand a task to Sai and how to run it to
  the end, including permission requests and sign-in links.

## Data and network

- The MCP server sends your tasks, the files you ask it to upload and your API
  key to the Sai API at `https://api.simular.ai`, which runs the task on your
  Sai cloud computer and returns its text result. Usage is billed to your Sai
  account.
- It serves a live view of the task on `127.0.0.1` on your own computer, linked
  as `watch_url`. Your API key never reaches the browser.
- `npx` downloads the pinned `@simular-ai/sai-mcp` package from the npm
  registry the first time it runs.
- The plugin stores nothing itself and has no hooks.

Privacy policy: [simular.ai/product-sai/privacy](https://www.simular.ai/product-sai/privacy).
Support: [support@simular.ai](mailto:support@simular.ai).

## License

MIT
