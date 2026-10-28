# Sai by Simular

Give Claude a computer. This plugin lets Claude Code hand tasks to
[Sai](https://platform.simular.ai), Simular's computer-use agent, #1 on
OSWorld 2.0. Sai uses apps and websites the way a person does, by seeing the
screen, clicking and typing, so Claude can get work done where there is no
API: web apps behind a login, admin consoles, desktop software, forms with no
import. Sai runs on a cloud computer Simular hosts; the free plan includes one.

## Compatibility

The Sai tools run in **Claude Code and Cowork** through a local stdio MCP
server. They do **not** run in claude.ai chat. See
[Claude's plugin compatibility documentation](https://support.claude.com/en/articles/13837440-use-plugins-in-claude).

## Install

Requires Node.js 22.12 or later on your computer.

1. Sign in at [platform.simular.ai](https://platform.simular.ai) and create an
   API key under [API Keys](https://platform.simular.ai/api-keys).
2. Install the plugin from `/plugin` in Claude Code (it is listed as
   **Sai by Simular**, with plugin ID `simular-sai`). When asked, paste the API
   key. It is stored in Claude Code's secure storage, not in a settings file.

Then ask Claude something like: "Use Sai to open Notepad on my cloud computer,
type Hello from Sai, and tell me the window title."

## What it contains

- **MCP server** `sai`: the open-source
  [`@simular-ai/sai-mcp`](https://www.npmjs.com/package/@simular-ai/sai-mcp)
  package, version 0.3.0, bundled as readable JavaScript modules and started
  with `node`. No npm install or package download runs during plugin installation
  or startup. Tools: start a
  task, wait for it, answer permission requests, stop it, upload a file, list
  computers and models.
- **Skill** `sai` (`/simular-sai:sai`): tells Claude when to hand a task to Sai and how to run it to
  the end, including permission requests and sign-in links.

## Data and network

- The MCP server sends your tasks, the files you ask it to upload and your API
  key to the Sai API at `https://api.simular.ai`, which runs the task on your
  Sai cloud computer and returns its text result. Usage is billed to your Sai
  account.
- It serves a live view of the task on `127.0.0.1` on your own computer, linked
  as `watch_url`. Your API key never reaches the browser.
- The server and its dependencies ship with the plugin. Its local task-view
  support keeps task metadata in memory for the running process. The plugin has
  no hooks.

Privacy policy: [simular.ai/product-sai/privacy](https://www.simular.ai/product-sai/privacy).
Support: [support@simular.ai](mailto:support@simular.ai).

## Directory review notes

The listing uses **Sai by Simular** to distinguish it from similarly named
connectors. Its plugin ID remains `simular-sai`, so the skill command is still
`/simular-sai:sai`. A name or publisher hold must be cleared by the directory
reviewer; changing the display name does not itself grant approval.

The server is launched with `node` from `runtime/server.mjs`. Each bundled
JavaScript file is smaller than 256 KiB and is not minified. There is no
install-time dependency manifest or lockfile. Runtime code does not load the
listing artwork or this document as code.

The `icon` field is for the directory listing; Claude Code ignoring it at load
time is expected. The listing artwork is a PNG, not an executable resource.

## Rebuilding and verifying

Run `node scripts/build-runtime.mjs` with Node.js, npm, GitHub CLI and tar
available. This maintainer-only build downloads upstream revision
`d24e862c06ef36d99ae9b6657096df18ff06dd40` of `simular-ai/sai-sdk`, installs its
locked build dependencies in a temporary directory with lifecycle scripts
disabled, and rebuilds the runtime. End users do not run this command.

`runtime/provenance.json` records the source revision, dependency versions and
SHA-256 hashes of the output modules. Third-party licenses are included in
`runtime/THIRD-PARTY-NOTICES.txt`.

Run `node scripts/check-runtime.mjs` to check file sizes and hashes and exercise
the stdio MCP server from a clean temporary copy without installed dependencies.

## License

MIT
