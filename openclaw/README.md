# Sai by Simular for OpenClaw

Give OpenClaw a cloud computer to automate websites and desktop apps.
Sai runs tasks on a cloud computer hosted by Simular and reports the results
back to your agent.

This folder is a standalone bundle package. OpenClaw reads its
`.claude-plugin/plugin.json` bundle marker, `.mcp.json`, and `skills/`.
The marker selects OpenClaw's supported Claude-bundle format; this package
has no Claude-specific API key prompt or dependency-install requirement.

## Install and configure

Requires Node.js 22.12 or later and npm. Create a Sai API key at
[platform.simular.ai/api-keys](https://platform.simular.ai/api-keys).

From a checkout of this repository, install the OpenClaw folder:

```bash
openclaw plugins install ./openclaw
```

Put your key in `~/.openclaw/.env`:

```dotenv
SAI_API_KEY=sapi_YOUR_KEY
```

Configure the MCP server before using Sai. OpenClaw's bundle MCP environment
does not resolve arbitrary shell-variable references, so the key must be
supplied through the configured server, which replaces the bundle's `sai`
server:

```bash
openclaw mcp set sai '{"command":"npx","args":["-y","@simular-ai/sai-mcp@0.4.0"],"env":{"SAI_API_KEY":"${SAI_API_KEY}"}}'
```

Keep the single quotes so OpenClaw resolves the variable when loading its
config. Without this step, Sai cannot authenticate.

Check the installation:

```bash
openclaw plugins inspect simular-sai
openclaw mcp status
```

Then ask: "Use Sai to open Notepad on my cloud computer, type Hello from Sai,
and tell me the window title."

## Publishing to ClawHub

From the repository root:

```bash
clawhub package publish ./openclaw --family bundle-plugin --bundle-format claude --dry-run
clawhub package publish ./openclaw --family bundle-plugin --bundle-format claude --wait
```

ClawHub takes the title and summary from this folder's `package.json` and
its logo from `assets/icon.png`. The package name
`simular-sai-claude-plugin` and runtime ID `simular-sai` preserve the existing
listing and plugin identity. Version 0.1.4 prepares the first folder-based
release; adding this folder does not publish it automatically.

Keep this package's version and bundle manifest version in sync. Its release
version is independent of the root Claude and `hermes/` packages. Copy skill
changes from `../skills/sai/SKILL.md` and logo changes from
`../.claude-plugin/icon.png`. Keep the pinned MCP version in `.mcp.json` and
the configuration command above aligned with the other hosts.

## Data and network

- `npx` downloads `@simular-ai/sai-mcp@0.4.0` and its dependencies from npm on
  first start.
- The server sends tasks, requested uploads, and your API key to
  `https://api.simular.ai`. Tasks use your Sai account's credit or free-plan
  computer time.
- The live-view server binds to `127.0.0.1`. The API key does not reach the
  browser.
- `sai_live_link` gives its holder access to the cloud computer until the
  link expires; share it only with the requesting user.

Privacy policy: [Simular](https://www.simular.ai/product-sai/privacy).
Support: [support@simular.ai](mailto:support@simular.ai).

## License

MIT. See [LICENSE](LICENSE).
