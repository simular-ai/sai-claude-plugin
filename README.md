# Sai by Simular

Give your AI agent a cloud computer to automate websites and desktop apps.
[Sai](https://platform.simular.ai), Simular's computer-use agent, handles tasks
behind logins and workflows without APIs on a cloud computer hosted by Simular.

This repository contains packages for three hosts:

| Host | Package location | Setup |
| --- | --- | --- |
| Claude Code and Cowork | Repository root | Instructions below |
| Hermes | `hermes/` | [Hermes setup](hermes/README.md) |
| OpenClaw | `openclaw/` | [OpenClaw setup and ClawHub publishing](openclaw/README.md) |

## Claude compatibility

The Sai tools run in **Claude Code and Cowork** through a local stdio MCP
server. They do **not** run in claude.ai chat. See
[Claude's plugin compatibility documentation](https://support.claude.com/en/articles/13837440-use-plugins-in-claude).

## Install in Claude

1. Sign in at [platform.simular.ai](https://platform.simular.ai) and create an
   API key under [API Keys](https://platform.simular.ai/api-keys).
2. Install the plugin from `/plugin` in Claude Code (it is listed as
   **Sai by Simular**, with plugin ID `simular-sai`). When asked, paste the API
   key. It is stored in Claude Code's secure storage, not in a settings file.

Then ask Claude something like: "Use Sai to open Notepad on my cloud computer,
type Hello from Sai, and tell me the window title."

## Install in OpenClaw

Use the standalone [openclaw/ package](openclaw/README.md), including its
API key configuration instructions. From a repository checkout, run
`openclaw plugins install ./openclaw`.

## Install in Hermes

See [hermes/README.md](hermes/README.md). The `hermes/` folder is a portable
Agent Plugins package with the same skill and MCP server.

## What it contains

- **MCP server** `sai`: the open-source
  [`@simular-ai/sai-mcp`](https://www.npmjs.com/package/@simular-ai/sai-mcp)
  package, pinned to an exact version in `package-lock.json` (with registry
  hashes) and started with `node`. Claude Code installs it when it installs the
  plugin, with install scripts off. Tools: start a
  task, wait for it, answer permission requests, stop it, upload a file, list
  computers and models, and hand the screen to a person with a link.
- **Skill** `sai` (`/simular-sai:sai`): tells Claude when to hand a task to Sai and how to run it to
  the end, including permission requests and sign-in links.

Each host reads its own files from the same repository:

| Host        | Manifest                     | MCP config  | API key from                    |
| ----------- | ---------------------------- | ----------- | ------------------------------- |
| Claude Code | `.claude-plugin/plugin.json` | `.mcp.json` | the install prompt (`userConfig`) |
| OpenClaw    | `openclaw/.claude-plugin/plugin.json` | `openclaw/.mcp.json`, overridden in your OpenClaw config | `SAI_API_KEY` |
| Hermes      | `hermes/plugin.json`         | `hermes/mcp.json` | Settings > Plugins or `SAI_API_KEY` |

All three pin the same MCP server version. When updating it, change the root
`package.json` and lockfile, `hermes/mcp.json`, `openclaw/.mcp.json`, and the
OpenClaw README configuration command. Keep the skill copies in
`skills/sai/`, `hermes/skills/sai/`, and `openclaw/skills/sai/` identical.
Keep `openclaw/assets/icon.png` identical to `.claude-plugin/icon.png`.

The following package details describe the root Claude package; see each
host's README for its launch and configuration behavior.

## Data and network

- The MCP server sends your tasks, the files you ask it to upload and your API
  key to the Sai API at `https://api.simular.ai`, which runs the task on your
  Sai cloud computer and returns its text result. Usage is billed to your Sai
  account.
- It serves a live view of the task on `127.0.0.1` on your own computer, linked
  as `watch_url`. Your API key never reaches the browser.
- Claude Code downloads the locked `@simular-ai/sai-mcp` package and its
  dependencies from the npm registry when it installs the plugin.
- The plugin stores nothing itself and has no hooks.

Privacy policy: [simular.ai/product-sai/privacy](https://www.simular.ai/product-sai/privacy).
Support: [support@simular.ai](mailto:support@simular.ai).

## Directory review notes

The listing uses **Sai by Simular** to distinguish it from similarly named
connectors. Its plugin ID remains `simular-sai`, so the skill command is still
`/simular-sai:sai`. A name or publisher hold must be cleared by the directory
reviewer; changing the display name does not itself grant approval.

The server is launched with `node`, not `npx`. Keep both `package.json` and
`package-lock.json`: together they pin `@simular-ai/sai-mcp` and its dependency
tree. The directory's suggestion to bundle files smaller than 256 KiB is an
optional alternative to installing dependencies, not a requirement to delete
the lockfile from this package.

The `icon` field is for the directory listing; Claude Code ignoring it at load
time is expected. The scanner's notice that it accepted `.claude-plugin/icon.png`
as an image is informational.

## ClawHub listing metadata

Publish only `openclaw/` to ClawHub. Its `package.json` owns the OpenClaw
listing title, description, and version; its `assets/icon.png` supplies the
logo. The root package description stays host-neutral. See the
[OpenClaw publishing instructions](openclaw/README.md#publishing-to-clawhub).

## License

MIT
