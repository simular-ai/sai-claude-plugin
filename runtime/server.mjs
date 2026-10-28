import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);
import {
  LIVE_ORIGINS,
  TASK_VIEW_TOOL_META,
  registerTaskView,
  taskViewHtml,
  taskViewTools
} from "./chunk-ONEDPEGL.mjs";
import {
  McpServer
} from "./chunk-V7C3VJE5.mjs";
import "./chunk-FD3OVPE3.mjs";
import {
  JSONRPCMessageSchema
} from "./chunk-VA2N4RH4.mjs";
import "./chunk-MNLAVQJF.mjs";
import {
  external_exports
} from "./chunk-66HR5ZBY.mjs";
import "./chunk-G3PKR6VD.mjs";
import "./chunk-4TBZ6BFZ.mjs";
import "./chunk-SUH7JHCB.mjs";
import "./chunk-TJPUDVPO.mjs";

// ../node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js
import process2 from "node:process";

// ../node_modules/@modelcontextprotocol/sdk/dist/esm/shared/stdio.js
var STDIO_DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;
var ReadBuffer = class {
  constructor(options) {
    this._maxBufferSize = options?.maxBufferSize ?? STDIO_DEFAULT_MAX_BUFFER_SIZE;
  }
  append(chunk) {
    const newSize = (this._buffer?.length ?? 0) + chunk.length;
    if (newSize > this._maxBufferSize) {
      this.clear();
      throw new Error(`ReadBuffer exceeded maximum size of ${this._maxBufferSize} bytes`);
    }
    this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
  }
  readMessage() {
    if (!this._buffer) {
      return null;
    }
    const index = this._buffer.indexOf("\n");
    if (index === -1) {
      return null;
    }
    const line = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
    this._buffer = this._buffer.subarray(index + 1);
    return deserializeMessage(line);
  }
  clear() {
    this._buffer = void 0;
  }
};
function deserializeMessage(line) {
  return JSONRPCMessageSchema.parse(JSON.parse(line));
}
function serializeMessage(message) {
  return JSON.stringify(message) + "\n";
}

// ../node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js
var StdioServerTransport = class {
  constructor(_stdin = process2.stdin, _stdout = process2.stdout, options) {
    this._stdin = _stdin;
    this._stdout = _stdout;
    this._started = false;
    this._ondata = (chunk) => {
      try {
        this._readBuffer.append(chunk);
        this.processReadBuffer();
      } catch (error) {
        this.onerror?.(error);
        this.close().catch(() => {
        });
      }
    };
    this._onerror = (error) => {
      this.onerror?.(error);
    };
    this._readBuffer = new ReadBuffer({ maxBufferSize: options?.maxBufferSize });
  }
  /**
   * Starts listening for messages on stdin.
   */
  async start() {
    if (this._started) {
      throw new Error("StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.");
    }
    this._started = true;
    this._stdin.on("data", this._ondata);
    this._stdin.on("error", this._onerror);
  }
  processReadBuffer() {
    while (true) {
      try {
        const message = this._readBuffer.readMessage();
        if (message === null) {
          break;
        }
        this.onmessage?.(message);
      } catch (error) {
        this.onerror?.(error);
      }
    }
  }
  async close() {
    this._stdin.off("data", this._ondata);
    this._stdin.off("error", this._onerror);
    const remainingDataListeners = this._stdin.listenerCount("data");
    if (remainingDataListeners === 0) {
      this._stdin.pause();
    }
    this._readBuffer.clear();
    this.onclose?.();
  }
  send(message) {
    return new Promise((resolve3) => {
      const json = serializeMessage(message);
      if (this._stdout.write(json)) {
        resolve3();
      } else {
        this._stdout.once("drain", resolve3);
      }
    });
  }
};

// src/api.ts
var ApiError = class extends Error {
  constructor(status, body, message) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
  status;
  body;
};
function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
function toNetworkError(url, err) {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new Error(`Request to ${hostOf(url)} timed out.`);
  }
  const cause = err instanceof Error ? err.cause : void 0;
  const detail = cause?.message ?? cause?.code ?? (err instanceof Error ? err.message : String(err));
  return new Error(
    `Could not reach the Sai API at ${hostOf(url)}: ${detail}. Check the network and SAI_API_URL.`
  );
}
async function readError(res, prefix) {
  const body = await res.json().catch(() => ({}));
  const detail = typeof body.message === "string" && body.message ? body.message : typeof body.error === "string" && body.error ? body.error : res.statusText;
  const hint = res.status === 401 ? " SAI_API_KEY was rejected \u2014 it may be revoked or expired (Firebase ID tokens last one hour)." : "";
  return new ApiError(res.status, body, `${prefix} (${res.status}): ${detail}${hint}`);
}
var SaiApi = class {
  constructor(apiUrl, apiKey, fetchImpl = (url, init) => fetch(url, init), versionTag) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.versionTag = versionTag;
  }
  apiUrl;
  apiKey;
  fetchImpl;
  versionTag;
  headers(extra = {}) {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      ...this.versionTag && { "x-sai-version": this.versionTag },
      ...extra
    };
  }
  async request(path, init) {
    const url = `${this.apiUrl}${path}`;
    const { prefix, ...rest } = init;
    let res;
    try {
      res = await this.fetchImpl(url, rest);
    } catch (err) {
      throw toNetworkError(url, err);
    }
    if (!res.ok) throw await readError(res, prefix);
    return res;
  }
  async json(path, init) {
    const res = await this.request(path, init);
    return await res.json();
  }
  // ─── Direct control (Layer 2: /v1/machines/:id/control) ─────────────────────
  controlPath(machineId2) {
    return `/v1/machines/${encodeURIComponent(machineId2)}/control`;
  }
  /**
   * `POST /v1/machines/:id/control` — opens the lease, waiting for the machine
   * (a free claim takes ~2 min). Answers at once if the lease is already open.
   */
  controlOpen(machineId2) {
    return this.json(this.controlPath(machineId2), {
      method: "POST",
      headers: this.headers(),
      signal: AbortSignal.timeout(24e4),
      prefix: "Opening control failed"
    });
  }
  /** `POST /v1/machines/:id/control/exec` — runs one Simulang block on the machine. */
  controlExec(machineId2, code, timeoutMs) {
    return this.json(`${this.controlPath(machineId2)}/exec`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code, ...timeoutMs !== void 0 && { timeoutMs } }),
      signal: AbortSignal.timeout((timeoutMs ?? 12e4) + 45e3),
      prefix: "Running the block failed"
    });
  }
  controlInterrupt(machineId2) {
    return this.json(`${this.controlPath(machineId2)}/interrupt`, {
      method: "POST",
      headers: this.headers(),
      signal: AbortSignal.timeout(3e4),
      prefix: "Interrupt failed"
    });
  }
  async controlClose(machineId2) {
    await this.request(this.controlPath(machineId2), {
      method: "DELETE",
      headers: this.headers(),
      signal: AbortSignal.timeout(3e4),
      prefix: "Closing control failed"
    });
  }
  // ─── OSWorld attempts (docs/plans/2026-10-07-osworld-runner-image.md §8) ───────
  /**
   * `POST /v1/benchmarks/osworld/attempts` — answers at once with state `starting`; the machine
   * and the task's setup follow in the background (poll `osworldGet`).
   */
  osworldStart(taskId) {
    return this.json("/v1/benchmarks/osworld/attempts", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ taskId }),
      signal: AbortSignal.timeout(9e4),
      prefix: "Starting the OSWorld task failed"
    });
  }
  osworldGet(attemptId) {
    return this.json(`/v1/benchmarks/osworld/attempts/${encodeURIComponent(attemptId)}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(9e4),
      prefix: "Reading the OSWorld attempt failed"
    });
  }
  osworldAskUser(attemptId, question) {
    return this.json(`/v1/benchmarks/osworld/attempts/${encodeURIComponent(attemptId)}/ask_user`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(9e4),
      prefix: "Asking the user failed"
    });
  }
  osworldAbandon(attemptId) {
    return this.json(`/v1/benchmarks/osworld/attempts/${encodeURIComponent(attemptId)}/abandon`, {
      method: "POST",
      headers: this.headers(),
      signal: AbortSignal.timeout(12e4),
      prefix: "Abandoning the OSWorld task failed"
    });
  }
  osworldEvaluate(attemptId, outcome = "done") {
    return this.json(`/v1/benchmarks/osworld/attempts/${encodeURIComponent(attemptId)}/evaluate`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ outcome }),
      signal: AbortSignal.timeout(11 * 6e4),
      prefix: "Grading the OSWorld task failed"
    });
  }
  /** `GET /auth` — verifies the credential and returns the caller's uid. */
  auth() {
    return this.json("/v1/agents/auth", {
      headers: this.headers(),
      signal: AbortSignal.timeout(15e3),
      prefix: "Auth check failed"
    });
  }
  async machines() {
    const { machines } = await this.json("/v1/agents/machines", {
      headers: this.headers(),
      signal: AbortSignal.timeout(15e3),
      prefix: "Failed to list machines"
    });
    return machines;
  }
  /**
   * `POST /machines/:id/live` — a view-only Guacamole tunnel for the caller's
   * own machine, for the MCP Apps task view. The URL carries a session token:
   * hand it to the view only, never to the model or a log.
   */
  liveScreen(machineId2) {
    return this.json(`/v1/agents/machines/${encodeURIComponent(machineId2)}/live`, {
      method: "POST",
      headers: this.headers(),
      signal: AbortSignal.timeout(2e4),
      prefix: "Live screen unavailable"
    });
  }
  /** GET /models — the catalog a task may name, with per-plan `allowed`. */
  async models() {
    const res = await this.request("/v1/agents/models", {
      method: "GET",
      headers: this.headers(),
      prefix: "Failed to list models"
    });
    return await res.json();
  }
  /** `POST /new-session` on the `api` channel; returns the fresh sessionId. */
  async newSession(machineId2) {
    const { sessionId } = await this.json("/v1/agents/new-session", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ machineId: machineId2, channel: "api" }),
      signal: AbortSignal.timeout(15e3),
      prefix: "Failed to start a new session"
    });
    return sessionId;
  }
  /**
   * Today's path: `POST /message` with the SSE stream (`wait` defaults to
   * true). Returns the open response; the caller parses the body.
   */
  async sendMessageStream(req, signal) {
    const res = await this.request("/v1/agents/message", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json", Accept: "text/event-stream" }),
      body: JSON.stringify({
        machineId: req.machineId,
        message: req.message,
        ...req.attachments && { attachments: req.attachments },
        ...req.model && { model: req.model },
        ...req.autonomous && { autonomous: true }
      }),
      ...signal && { signal },
      prefix: "Failed to send the task"
    });
    if (!res.body) throw new Error("The Sai API returned no response body for the task stream.");
    return res;
  }
  /** A1: `POST /message` with `wait: false` → `202 { sessionId, machineId, queued }`. */
  sendMessageNoWait(req) {
    return this.json("/v1/agents/message", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        machineId: req.machineId,
        message: req.message,
        wait: false,
        ...req.attachments && { attachments: req.attachments },
        ...req.model && { model: req.model },
        ...req.autonomous && { autonomous: true }
      }),
      signal: AbortSignal.timeout(3e4),
      prefix: "Failed to send the task"
    });
  }
  /** A2: `GET /events?sessionId&since&wait` — long-polls up to `waitS` (0..60) seconds. */
  events(sessionId, since, waitS) {
    const params = new URLSearchParams({ sessionId, wait: String(waitS) });
    if (since) params.set("since", since);
    return this.json(`/v1/agents/events?${params}`, {
      headers: this.headers(),
      // The server holds for `waitS`; give it headroom before giving up locally.
      signal: AbortSignal.timeout((waitS + 15) * 1e3),
      prefix: "Failed to fetch task events"
    });
  }
  approve(approvalId, response, selections) {
    return this.json("/v1/agents/approve", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ approvalId, response, ...selections && { selections } }),
      signal: AbortSignal.timeout(15e3),
      prefix: "Failed to resolve the approval"
    });
  }
  /** `POST /abort { sessionId }` — owner-checked on the session doc (cloud-api 36c5e4729). */
  abort(sessionId) {
    return this.json("/v1/agents/abort", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(15e3),
      prefix: "Failed to abort the task"
    });
  }
  /**
   * `POST /upload`: raw bytes in the body, the original name URL-encoded in
   * `x-filename`. The server derives MIME from the extension and ignores
   * Content-Type.
   */
  upload(name, bytes) {
    return this.json("/v1/agents/upload", {
      method: "POST",
      headers: this.headers({
        "Content-Type": "application/octet-stream",
        "x-filename": encodeURIComponent(name)
      }),
      body: bytes,
      signal: AbortSignal.timeout(12e4),
      prefix: "Upload failed"
    });
  }
};

// src/config.ts
var DEFAULT_API_URL = "https://api.simular.ai";
var APPROVAL_URL_BASE = "https://sai.simular.ai/approval";
function flag(value) {
  return value === "1" || value === "true";
}
function readConfig(env = process.env) {
  const apiKey = env.SAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "SAI_API_KEY is not set. Create an API key at https://platform.simular.ai/api-keys and export it as SAI_API_KEY."
    );
  }
  const apiUrl = (env.SAI_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, "");
  return {
    apiKey,
    apiUrl,
    push: flag(env.SAI_PUSH),
    // Default ON: `wait:false` + `GET /events` is the contract callers are
    // documented against and the only mode without the stream's 5-minute
    // ceiling. `SAI_EVENTS_API=0` falls back to collecting the SSE stream, for a
    // server predating A1/A2.
    eventsApi: env.SAI_EVENTS_API === void 0 ? true : flag(env.SAI_EVENTS_API),
    localView: env.SAI_LOCAL_VIEW === void 0 ? true : flag(env.SAI_LOCAL_VIEW),
    control: (env.SAI_CONTROL === void 0 ? true : flag(env.SAI_CONTROL)) || flag(env.SAI_OSWORLD),
    osworld: flag(env.SAI_OSWORLD),
    ...env.SAI_API_VERSION_TAG?.trim() && { versionTag: env.SAI_API_VERSION_TAG.trim() }
  };
}

// src/reducer.ts
function initialState() {
  return { status: "running", events: [], text: "" };
}
var ACTIVITY_TYPES = /* @__PURE__ */ new Set([
  "text-start",
  "text-delta",
  "text-end",
  "reasoning-start",
  "reasoning-delta",
  "reasoning-end",
  "tool-input-start",
  "tool-input-available",
  "tool-output-error",
  "data-progress"
]);
function applyEvent(state, event) {
  state.events.push(event);
  switch (event.type) {
    case "text-delta":
      state.text += event.delta;
      state.status = "running";
      state.approval = void 0;
      break;
    case "data-approval-request":
      state.status = "needs_approval";
      state.approval = event.data;
      break;
    case "finish":
      state.status = "idle";
      state.approval = void 0;
      break;
    case "error":
      state.status = "error";
      state.error = event.errorText;
      state.errorCode = event.code;
      state.approval = void 0;
      break;
    default:
      if (ACTIVITY_TYPES.has(event.type)) {
        state.status = "running";
        state.approval = void 0;
      }
  }
  return state;
}
function decodeCursor(cursor, max) {
  if (!cursor) return 0;
  const n = Number.parseInt(cursor, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}
function encodeCursor(index) {
  return String(index);
}
function markApprovalResolved(state, approvalId) {
  if (state.status === "needs_approval" && state.approval?.approvalId === approvalId) {
    state.status = "running";
    state.approval = void 0;
  }
}

// src/sse.ts
async function* parseSse(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const event = parseFrame(part);
        if (event) yield event;
      }
    }
    const tail = parseFrame(buffer);
    if (tail) yield tail;
  } finally {
    await reader.cancel().catch(() => void 0);
  }
}
function parseFrame(part) {
  const line = part.trim();
  if (!line.startsWith("data: ")) return void 0;
  const json = line.slice("data: ".length);
  if (json === "[DONE]") return void 0;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed.type !== "string") return void 0;
    return parsed;
  } catch {
    return void 0;
  }
}

// src/session-source.ts
var Notifier = class {
  waiters = /* @__PURE__ */ new Set();
  signal() {
    const current = [...this.waiters];
    this.waiters.clear();
    for (const wake of current) wake();
  }
  wait(ms) {
    return new Promise((resolve3) => {
      const timer = setTimeout(
        () => {
          this.waiters.delete(wake);
          resolve3();
        },
        Math.max(0, ms)
      );
      timer.unref?.();
      const wake = () => {
        clearTimeout(timer);
        resolve3();
      };
      this.waiters.add(wake);
    });
  }
};
function snapshot(state, cursor) {
  const from = decodeCursor(cursor, state.events.length);
  return {
    status: state.status,
    events: state.events.slice(from),
    text: state.text,
    ...state.status === "needs_approval" && state.approval && { approval: state.approval },
    cursor: encodeCursor(state.events.length),
    ...state.status === "error" && state.error && { error: state.error },
    ...state.status === "error" && state.errorCode && { errorCode: state.errorCode }
  };
}
var DEFAULT_WAIT_WHILE = ["running"];
function shouldKeepWaiting(status, approvalId, waitWhile, knownApprovalId) {
  if (!waitWhile.includes(status)) return false;
  if (status === "needs_approval" && approvalId !== knownApprovalId) return false;
  return true;
}
var STREAM_CLOSED_ERROR = "The connection to Sai closed before the task finished. The task may still be running on the machine; start a new sai_task_start to continue the conversation, or check the Sai app.";
var StreamCollector = class {
  constructor(api, log2 = () => {
  }) {
    this.api = api;
    this.log = log2;
  }
  api;
  log;
  sessions = /* @__PURE__ */ new Map();
  async start(req) {
    const res = await this.api.sendMessageStream(req);
    const events = parseSse(res.body);
    return new Promise((resolve3, reject) => {
      let tracked;
      let lastStatusText;
      const pump = async () => {
        try {
          for await (const event of events) {
            if (!tracked) {
              if (event.type === "start") continue;
              if (event.type === "data-session") {
                tracked = this.track(event.data.sessionId, req.machineId);
                resolve3({
                  sessionId: event.data.sessionId,
                  machineId: req.machineId,
                  queued: false
                });
                continue;
              }
              if (event.type === "data-status") {
                lastStatusText = event.data.text;
                continue;
              }
              if (event.type === "error") {
                reject(new Error(event.errorText));
                return;
              }
              if (event.type === "finish") {
                reject(
                  new Error(lastStatusText ?? "Sai handled the message without starting a task.")
                );
                return;
              }
              continue;
            }
            if (event.type === "start" || event.type === "data-session") continue;
            this.push(tracked, event);
          }
          if (!tracked) {
            reject(new Error("The task stream closed before Sai reported a session id."));
          } else if (tracked.state.status === "running" || tracked.state.status === "needs_approval") {
            this.push(tracked, { type: "error", errorText: STREAM_CLOSED_ERROR });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!tracked) reject(new Error(`The task stream failed: ${message}`));
          else
            this.push(tracked, { type: "error", errorText: `${STREAM_CLOSED_ERROR} (${message})` });
        }
      };
      void pump();
    });
  }
  track(sessionId, machineId2) {
    const tracked = { machineId: machineId2, state: initialState(), notifier: new Notifier() };
    this.sessions.set(sessionId, tracked);
    this.log(`session ${sessionId}: tracking turn on machine ${machineId2}`);
    return tracked;
  }
  push(tracked, event) {
    applyEvent(tracked.state, event);
    tracked.notifier.signal();
  }
  async wait(sessionId, opts) {
    const tracked = this.sessions.get(sessionId);
    if (!tracked) {
      throw new Error(
        `Unknown session ${sessionId}: only sessions started by sai_task_start in this MCP server process can be waited on. Call sai_task_start again to continue the conversation.`
      );
    }
    const waitWhile = opts.waitWhile ?? DEFAULT_WAIT_WHILE;
    const knownApprovalId = tracked.state.approval?.approvalId;
    const deadline = Date.now() + opts.timeoutMs;
    while (shouldKeepWaiting(
      tracked.state.status,
      tracked.state.approval?.approvalId,
      waitWhile,
      knownApprovalId
    )) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await tracked.notifier.wait(remaining);
      if (opts.returnOnEvents) break;
    }
    return snapshot(tracked.state, opts.cursor);
  }
  findApproval(approvalId) {
    for (const [sessionId, tracked] of this.sessions) {
      const approval = tracked.state.approval;
      if (approval?.approvalId === approvalId) return { sessionId, approval };
    }
    return void 0;
  }
  noteApprovalResolved(approvalId) {
    for (const tracked of this.sessions.values()) {
      markApprovalResolved(tracked.state, approvalId);
      tracked.notifier.signal();
    }
  }
};
var EVENTS_MAX_WAIT_S = 60;
var APPROVAL_REPOLL_MS = 5e3;
function sleep(ms) {
  return new Promise((resolve3) => {
    const t = setTimeout(resolve3, ms);
    t.unref?.();
  });
}
var EventsPoller = class {
  constructor(api) {
    this.api = api;
  }
  api;
  sessions = /* @__PURE__ */ new Map();
  async start(req) {
    const result = await this.api.sendMessageNoWait(req);
    if (!result.sessionId) {
      const handled = result;
      const reply = typeof handled.reply === "string" ? handled.reply : handled.error;
      throw new Error(
        `Sai answered without starting a task: ${typeof reply === "string" ? reply : ""}`.trim()
      );
    }
    this.sessions.set(result.sessionId, { machineId: result.machineId, state: initialState() });
    return result;
  }
  /**
   * `/events` sits behind a gateway that can answer 502/503/504 for a moment
   * (a cold replica, a long-poll cut at the edge — seen once on staging). Those
   * are not the caller's fault and not the task's state, so retry a few times
   * before surfacing them; every other status goes straight to the caller.
   */
  async eventsWithRetry(sessionId, since, waitS) {
    const RETRIES = 3;
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.api.events(sessionId, since, waitS);
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        if (attempt >= RETRIES || status !== 502 && status !== 503 && status !== 504) throw err;
        await sleep(1e3 * (attempt + 1));
      }
    }
  }
  async wait(sessionId, opts) {
    const polled = this.sessions.get(sessionId) ?? this.sessions.set(sessionId, { state: initialState() }).get(sessionId);
    const waitWhile = opts.waitWhile ?? DEFAULT_WAIT_WHILE;
    const knownApprovalId = polled.state.approval?.approvalId;
    const deadline = Date.now() + opts.timeoutMs;
    const collected = [];
    let since = opts.cursor;
    let status = "running";
    let text = "";
    let usage;
    let sessionUsage;
    let first = !(opts.returnOnEvents && opts.cursor);
    for (; ; ) {
      const remainingS = Math.ceil((deadline - Date.now()) / 1e3);
      const waitS = first ? 0 : Math.max(0, Math.min(EVENTS_MAX_WAIT_S, remainingS));
      first = false;
      const page = await this.eventsWithRetry(sessionId, since, waitS);
      for (const event of page.events) {
        collected.push(event);
        applyEvent(polled.state, event);
      }
      since = page.cursor;
      status = page.status;
      text = page.text;
      usage = page.usage ?? usage;
      sessionUsage = page.sessionUsage ?? sessionUsage;
      if (page.approval) {
        polled.state.approval = page.approval;
        polled.state.status = "needs_approval";
      }
      if (!shouldKeepWaiting(status, polled.state.approval?.approvalId, waitWhile, knownApprovalId) || Date.now() >= deadline || opts.returnOnEvents && collected.length > 0) {
        break;
      }
      if (status !== "running") {
        await sleep(Math.min(APPROVAL_REPOLL_MS, Math.max(0, deadline - Date.now())));
      }
    }
    const errorEvent = [...collected].reverse().find((e) => e.type === "error");
    const errorCode = errorEvent && errorEvent.type === "error" ? errorEvent.code : polled.state.errorCode;
    return {
      status,
      events: collected,
      text,
      ...usage && { usage },
      ...sessionUsage && { sessionUsage },
      ...status === "needs_approval" && polled.state.approval && { approval: polled.state.approval },
      cursor: since ?? "",
      ...status === "error" && {
        error: errorEvent && errorEvent.type === "error" ? errorEvent.errorText : polled.state.error
      },
      ...status === "error" && errorCode && { errorCode }
    };
  }
  findApproval(approvalId) {
    for (const [sessionId, polled] of this.sessions) {
      const approval = polled.state.approval;
      if (approval?.approvalId === approvalId) return { sessionId, approval };
    }
    return void 0;
  }
  noteApprovalResolved(approvalId) {
    for (const polled of this.sessions.values()) markApprovalResolved(polled.state, approvalId);
  }
};

// src/tools.ts
import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
var WAIT_DEFAULT_S = 45;
var WAIT_MAX_S = 55;
var decisionSchema = external_exports.enum(["approve", "approve_for_task", "deny"]);
var toolSchemas = {
  sai_machines: {},
  sai_task_start: {
    task: external_exports.string().min(1).describe("What Sai should do, in plain language. Be specific."),
    machine_id: external_exports.string().min(1).optional().describe(
      "Target machine from sai_machines. Optional when the account has exactly one machine."
    ),
    file_ids: external_exports.array(external_exports.string().min(1)).optional().describe("file_id values returned by sai_upload in this server process, to attach."),
    new_session: external_exports.boolean().optional().describe(
      "true = clear the conversation on this machine first. Default false: the task continues the existing api-channel conversation, so Sai remembers earlier tasks."
    ),
    model: external_exports.string().min(1).optional().describe(
      'Model id from sai_models (or "auto"). Sticks to the session until changed. Omit to keep the account default.'
    ),
    autonomous: external_exports.boolean().optional().describe(
      'true = run this task without approval prompts, as if "approve_for_task" had been answered up front; the grant ends with the task. Only when the user asked for the task to run unattended. Has no effect when the message steers a running task.'
    )
  },
  sai_models: {},
  sai_task_wait: {
    session_id: external_exports.string().min(1).describe("session_id from sai_task_start."),
    timeout_s: external_exports.number().int().min(1).max(WAIT_MAX_S).optional().describe(`Seconds to block for. Default ${WAIT_DEFAULT_S}, max ${WAIT_MAX_S}.`),
    cursor: external_exports.string().optional().describe("cursor from the previous sai_task_wait result; omit on the first call.")
  },
  sai_task_approve: {
    approval_id: external_exports.string().min(1).describe("approval.approvalId from a needs_approval result."),
    decision: decisionSchema.describe(
      "approve = allow this one request; approve_for_task = trust similar requests for the rest of this task; deny = refuse."
    ),
    selections: external_exports.array(external_exports.array(external_exports.string())).optional().describe(
      'For approvalType "choice" only: one inner array per question, holding the chosen option values (or free text when allowOther). Required to approve a choice.'
    )
  },
  sai_task_abort: {
    session_id: external_exports.string().min(1).describe("session_id from sai_task_start.")
  },
  sai_upload: {
    path: external_exports.string().min(1).describe("Absolute or cwd-relative path of a local file (max 25 MB).")
  }
};
var NO_SCREENSHOT = "Task tools return no screenshots: Sai sees the screen itself and reports back in text.";
var toolDescriptions = {
  sai_machines: "List the Sai machines (cloud computers or the user's own desktops) this account can drive. Returns { machines: [{ machineId, name, kind?, online? }], default? } \u2014 `default` is set when there is exactly one machine, in which case sai_task_start may omit machine_id. Call this once per conversation, not before every task. An empty list means the account has no computer yet: this server cannot create one (it costs money and needs the signed-in user), so send the user to https://platform.simular.ai/playground to create it in one click.",
  sai_models: 'List the models Sai can run a task with: { models: [{ id, name, provider, tier, costTier, allowed }], default }. `allowed` is per plan (free accounts have an allowlist). Pass an id as sai_task_start.model to switch the session\'s model; "auto" lets Sai pick. Only call this when the user asks for a specific model or a task needs a stronger/faster one.',
  sai_task_start: `Send a task to Sai, an autonomous computer-use agent that operates a real Windows/macOS desktop (browser, apps, files) on the chosen machine. Use it for work that needs a screen or the user's logged-in accounts, e.g. "Log in to the vendor portal and list last month's invoices with totals" or "Follow this bug report in Chrome and describe what happens at each step". Returns { session_id, machine_id, queued, push, watch_url? } immediately; the task keeps running on the machine. watch_url is a local page where the user can watch the computer live and approve steps: always give it to the user as a clickable link (some apps can only show the screen there). Then call sai_task_wait with session_id until status is not "running" \u2014 UNLESS push is true, in which case do NOT call sai_task_wait: the result arrives as a channel notification and you should continue with other work. One conversation per machine persists on the "api" channel across calls (Sai remembers earlier tasks and their results); pass new_session: true to start clean. queued: true means Sai was busy and the message was parked as a steer for the running task. ` + NO_SCREENSHOT,
  sai_task_wait: `Block up to timeout_s (default ${WAIT_DEFAULT_S}, max ${WAIT_MAX_S}) for the task to leave the "running" state. Returns { status, events, text, approval?, usage?, sessionUsage?, cursor, error? }. usage is this task's model tokens and cost so far (inputTokens, outputTokens, cacheReadTokens, costUsd, byModel); sessionUsage is the same across the session's tasks.  status: "running" = timed out, call again passing the returned cursor; "needs_approval" = Sai is paused on \`approval\` \u2014 if approval.isLinkOnly is false decide with sai_task_approve, if true give approval.approvalUrl to the human and call sai_task_wait again; "idle" = done, \`text\` is Sai's answer; "error" = failed, see \`error\`. \`text\` is the assistant text of the whole turn so far; \`events\` are only the frames since \`cursor\`. ` + NO_SCREENSHOT,
  sai_task_approve: 'Resolve a pending approval from a needs_approval result. decision: approve | approve_for_task | deny. For approvalType "choice" pass `selections` with the chosen option values. Returns { ok: true } or, when the approval can only be completed by a human in a browser (OAuth consent, credentials, phone verification), { ok: false, reason: "link_only", approval_url } \u2014 hand approval_url to the human, then keep waiting. Only approve actions the user has actually asked for; when in doubt, ask the human.',
  sai_task_abort: "Stop the task running in this session. Returns { ok, aborted, reason? }; aborted: false with a reason means nothing was running. Safe to call twice.",
  sai_upload: "Upload a local file (max 25 MB) so Sai can use it. Returns { file_id, name, mime, size }; pass file_id in sai_task_start.file_ids. The uploaded file lands in the machine's Sai files, not at the original path."
};
var serverInstructions = [
  "Sai is an autonomous computer-use agent that operates a real desktop (browser, native apps, files, email) on the user's Sai machine.",
  "Use it when the work needs a screen: sites and apps with no API (vendor portals, admin consoles, legacy web apps), web apps behind the user's logins (sign-ins go to the human as an approval link), desktop software on Windows, macOS or Linux, or seeing what a real user sees (testing a sign-up flow, reproducing a bug). Don't use it for what you can do locally or through an API.",
  'For a workflow the user will repeat, ask Sai after the first run to save it as a replayable skill with parameters ("Save this as a replayable skill named invoice_export, with vendor and month as parameters"); later, ask Sai to run that skill. Sai replays it as code, asking the model only where the screen matters, and the agent takes over if the UI changed.',
  "",
  "The loop:",
  "1. sai_machines once (skip when you already know the machine_id).",
  "2. sai_task_start { task, machine_id? } \u2192 session_id. Write the task as you would brief a capable colleague: goal, constraints, what to report back.",
  '3. sai_task_wait { session_id } and repeat while status is "running", passing the returned cursor each time.',
  '   - needs_approval: read `approval`. isLinkOnly false \u2192 sai_task_approve (approve / approve_for_task / deny; "choice" needs selections). isLinkOnly true \u2192 give approval.approvalUrl to the human, then wait again.',
  "   - idle: `text` is the answer. Report it to the user.",
  "   - error: report `error`; sai_task_start again to retry or rephrase.",
  "4. sai_task_abort to stop a task the user no longer wants.",
  "",
  'One conversation per machine persists on the "api" channel across calls, so follow-up tasks can refer to earlier ones; pass new_session: true when the topic changes.',
  'If sai_task_start returns push: true, do NOT call sai_task_wait \u2014 a channel notification (<channel source="sai" session_id=... event=...>) delivers needs_approval / idle / error; continue other work meanwhile.',
  NO_SCREENSHOT
].join("\n");
function decisionToResponse(decision) {
  switch (decision) {
    case "approve":
      return "yes";
    case "approve_for_task":
      return "task";
    case "deny":
      return "no";
  }
}
function clampTimeoutS(timeoutS) {
  if (timeoutS === void 0 || !Number.isFinite(timeoutS)) return WAIT_DEFAULT_S;
  return Math.min(WAIT_MAX_S, Math.max(1, Math.floor(timeoutS)));
}
function buildApprovalUrl(userId, approvalId) {
  return `${APPROVAL_URL_BASE}/${encodeURIComponent(userId)}/${encodeURIComponent(approvalId)}`;
}
function machinesResult(rows) {
  const machines = rows.map((m) => ({
    machineId: m.machineId,
    ...m.name !== void 0 && { name: m.name },
    ...m.kind !== void 0 && { kind: m.kind },
    ...m.online !== void 0 && { online: m.online },
    ...m.state !== void 0 && { state: m.state },
    // Pre-A4 servers send `status` instead of `online`; pass it through rather than guess.
    ...m.online === void 0 && m.status !== void 0 && { status: m.status }
  }));
  const only = machines.length === 1 ? machines[0] : void 0;
  return { machines, ...only && { default: only.machineId } };
}
var SaiTools = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  ctx;
  /** Uploads made in this process, keyed by fileId — `/message` needs the full attachment row. */
  uploads = /* @__PURE__ */ new Map();
  async machines() {
    return machinesResult(await this.ctx.api.machines());
  }
  async models() {
    return this.ctx.api.models();
  }
  async resolveMachineId(machineId2) {
    if (machineId2) return machineId2;
    const rows = await this.ctx.api.machines();
    if (rows.length === 1) return rows[0].machineId;
    if (rows.length === 0) {
      throw new Error(
        "This account has no computer yet. Ask the user to create one: one click at https://platform.simular.ai/playground (a paid plan creates its own cloud computer; the free plan gets one automatically on its first task). Then call sai_machines again."
      );
    }
    const list = rows.map((m) => `${m.machineId}${m.name ? ` (${m.name})` : ""}`).join(", ");
    throw new Error(`machine_id is required: this account has ${rows.length} machines: ${list}`);
  }
  async start(args) {
    const machineId2 = await this.resolveMachineId(args.machine_id);
    const attachments = args.file_ids?.map((id) => {
      const file = this.uploads.get(id);
      if (!file) {
        throw new Error(
          `Unknown file_id ${id}: only files uploaded with sai_upload in this MCP server process can be attached.`
        );
      }
      return file;
    });
    if (args.new_session) await this.ctx.api.newSession(machineId2);
    const started = await this.ctx.source.start({
      machineId: machineId2,
      message: args.task,
      ...attachments && attachments.length > 0 && { attachments },
      ...args.model && { model: args.model },
      ...args.autonomous && { autonomous: true }
    });
    if (this.ctx.push) this.ctx.onSessionStarted?.(started.sessionId);
    return {
      session_id: started.sessionId,
      machine_id: started.machineId,
      queued: started.queued,
      push: this.ctx.push
    };
  }
  async wait(args, opts = {}) {
    const result = await this.ctx.source.wait(args.session_id, {
      timeoutMs: clampTimeoutS(args.timeout_s) * 1e3,
      ...args.cursor !== void 0 && { cursor: args.cursor },
      ...opts.returnOnEvents && { returnOnEvents: true }
    });
    return this.decorate(result);
  }
  /** Fills `approvalUrl` on a buffered link-only approval if the server sent none. */
  async decorate(result) {
    if (!result.approval) return result;
    return { ...result, approval: await this.withUrl(result.approval) };
  }
  async withUrl(approval) {
    if (approval.approvalUrl || !approval.isLinkOnly) return approval;
    const uid = await this.ctx.userId();
    return uid ? { ...approval, approvalUrl: buildApprovalUrl(uid, approval.approvalId) } : approval;
  }
  async approve(args) {
    const known = this.ctx.source.findApproval(args.approval_id);
    if (known?.approval.isLinkOnly) {
      const { approvalUrl } = await this.withUrl(known.approval);
      return { ok: false, reason: "link_only", ...approvalUrl && { approval_url: approvalUrl } };
    }
    try {
      const res = await this.ctx.api.approve(
        args.approval_id,
        decisionToResponse(args.decision),
        args.selections
      );
      this.ctx.source.noteApprovalResolved(args.approval_id);
      return {
        ok: true,
        ...res.status && { status: res.status },
        ...res.note && { note: res.note }
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.body.error === "link_only") {
        const fromServer = typeof err.body.approvalUrl === "string" ? err.body.approvalUrl : void 0;
        const uid = fromServer ? void 0 : await this.ctx.userId();
        const url = fromServer ?? (uid ? buildApprovalUrl(uid, args.approval_id) : void 0);
        return { ok: false, reason: "link_only", ...url && { approval_url: url } };
      }
      throw err;
    }
  }
  async abort(args) {
    return this.ctx.api.abort(args.session_id);
  }
  async upload(args) {
    const filePath = resolve(args.path);
    const info = await stat(filePath).catch(() => void 0);
    if (!info?.isFile()) throw new Error(`File not found: ${filePath}`);
    if (info.size > 25 * 1024 * 1024) {
      throw new Error(`File is ${Math.round(info.size / (1024 * 1024))} MB; the maximum is 25 MB.`);
    }
    const bytes = await readFile(filePath);
    const uploaded = await this.ctx.api.upload(basename(filePath), bytes);
    this.uploads.set(uploaded.fileId, uploaded);
    return {
      file_id: uploaded.fileId,
      name: uploaded.name,
      mime: uploaded.mime,
      size: uploaded.size
    };
  }
};

// src/control.ts
var EXEC_DEFAULT_S = 90;
var EXEC_MAX_S = 110;
var SIMULANG_REFERENCE = `# Simulang in Sai direct control

Direct control is a JavaScript REPL running ON one cloud computer (Windows, Linux or macOS).
Top-level await works and variables persist between blocks (use \`var\`).
The block's last expression is returned. console.log output comes back in \`logs\`.

## The machine: \`machine\` (already held by your control lease)
Shell and files:
  await machine.exec({ command, cwd?, timeout? })      \u2192 { stdout, stderr, exitCode, timedOut }
  await machine.readFile({ path })                      \u2192 the file's text
  await machine.writeToFile({ text, path, overwrite? }) APPENDS unless overwrite: true
Screen:
  await machine.pageContent()                           \u2192 { text: Snapshot, imageBase64 } of the whole screen; the screen is returned to you as an image
  await machine.ground({ concept, app? })               \u2192 { x, y } via a vision model (app crops to its window)
  await machine.stateSatisfies({ condition })           \u2192 boolean, via a vision model
Input (coordinates are screen pixels):
  await machine.click({ x, y }) \xB7 move \xB7 drag({ fromX, fromY, toX, toY })
  await machine.type({ text }) \xB7 press({ key }) \xB7 shortCut({ key }) \xB7 scroll({ direction })
  await machine.copyToClipboard({ text }) \xB7 getFromClipboard()
Apps and windows:
  await machine.open({ app?, url? })
  var app = await machine.launch('notepad')             \u2192 App
  await machine.getAppWindow(title) \u2192 App[] \xB7 listWindows() / getWindow(title) / focusedWindow() \u2192 Window[]

## Browser (Chrome over DevTools \u2014 prefer this for web pages)
  var page = await machine.browser.newtab(url?)         \u2192 Page \xB7 browser.listTabs() \xB7 browser.getTab(id)
  await page.goto({ url }) \xB7 page.url() \xB7 back() \xB7 reload()
  var snap = await page.snapshot()                      \u2192 { snapshot: Snapshot, refs, url, title } (+ screenshot)
  await page.click({ ref }) \xB7 type({ ref, text, submit? }) \xB7 press({ key }) \xB7 fill({ fields }) \xB7 select({ ref, values })
  await page.scroll({ direction }) \xB7 wait({ text? , waitTime? }) \xB7 screenshot() \xB7 evaluate({ fn })
  await page.find(query) / page.waitFor(query)          \u2192 selector match, model fallback

## Native apps (accessibility tree)
  var snap = await app.snapshot()                       \u2192 { snapshot: Snapshot, refs } (+ screenshot)
  await app.click({ ref }) \xB7 type({ ref, text }) \xB7 press({ key }) \xB7 scroll({ ref }) \xB7 find(query)
Refs come from the LATEST snapshot: snapshot, act, snapshot again.

## Snapshot
  snap.snapshot.outline()   markdown view with refs inline, e.g. [Save](ref=e5)
  snap.snapshot.grep(pattern) \xB7 snap.snapshot.read(line, { context: 5 }) \xB7 await snap.snapshot.find(query)

## Also
  await wait({ waitTime: 2 })   seconds (unit: 'ms' for milliseconds)
  $lastVisualObservation, $lastAccessibilityObservation, $lastExec

Not available in direct control: sai.*, integrations (google, slack, \u2026), callLLM, askUser,
requestApproval, generateImage, secrets. Do those from your own program.
`;
var machineId = external_exports.string().min(1).describe("Cloud computer from sai_machines.");
var controlToolSchemas = {
  sai_control_open: { machine_id: machineId },
  sai_control_exec: {
    machine_id: external_exports.string().min(1).describe("machine_id passed to sai_control_open."),
    code: external_exports.string().min(1).describe("Simulang (JavaScript) to run on the machine."),
    timeout_s: external_exports.number().int().min(1).max(EXEC_MAX_S).optional().describe(
      `Seconds the block may run. Default ${EXEC_DEFAULT_S}, max ${EXEC_MAX_S}. Split longer work into several blocks.`
    )
  },
  sai_control_interrupt: {
    machine_id: external_exports.string().min(1).describe("Machine whose running block should stop.")
  },
  sai_control_close: {
    machine_id: external_exports.string().min(1).describe("Machine to release.")
  }
};
var controlToolDescriptions = {
  sai_control_open: "Take direct control of a Sai cloud computer so YOU can drive it by running Simulang (JavaScript) blocks with sai_control_exec. Use this instead of sai_task_start when you want step-by-step control, or want to write a script you can replay. Returns { machine_id, expires_after_idle_s }. Control holds the computer: Sai tasks on it wait until you close it. Calling it again while control is open is fine and returns at once. Can take up to ~2 minutes while the computer starts. Read sai://simulang/reference for the API.",
  sai_control_exec: "Run one Simulang block on the computer you control. Returns { result, logs, error?, variables, duration_ms } and, when the block took a screenshot (machine.pageContent(), page/app snapshot or screenshot()), that screenshot as an image. Variables persist between blocks (use `var`). Prefer page.snapshot()/app.snapshot() refs over pixel clicks. error.kind: exception | timeout | interrupted. If control has ended (closed, idle, taken by a Sai task, or the computer stopped answering) it fails with 410 control_closed and a reason: call sai_control_open again for a fresh lease.\n\nQuick reference: `await machine.exec({ command })`, `var page = await machine.browser.newtab(url)`, `var snap = await page.snapshot(); snap.snapshot.outline()`, `await page.click({ ref })`, `await machine.pageContent()`, `await machine.ground({ concept })` \u2192 { x, y }, `await machine.click({ x, y })`. Full API: resource sai://simulang/reference.",
  sai_control_interrupt: "Stop the running block (it ends at its next primitive call or loop iteration). Returns { interrupted }; false means nothing was running.",
  sai_control_close: "Release the computer: resets the REPL and frees the computer for Sai tasks. Always close when you are done."
};
var controlInstructions = [
  "",
  "Direct control (drive the computer yourself): sai_control_open \u2192 sai_control_exec blocks of Simulang \u2192 sai_control_close.",
  "Each sai_control_exec result includes a screenshot image when the block captured one. Read sai://simulang/reference first."
].join("\n");
function execToolResult(r) {
  const { observations, durationMs, ...rest } = r;
  const text = { ...rest, duration_ms: durationMs };
  const shot = observations?.screenshot;
  return {
    content: [
      { type: "text", text: JSON.stringify(text, null, 2) },
      ...shot ? [{ type: "image", data: shot.base64, mimeType: shot.mimeType }] : []
    ]
  };
}
function registerControlTools(mcp, api, run2, fail2) {
  mcp.registerResource(
    "simulang-reference",
    "sai://simulang/reference",
    {
      title: "Simulang reference (direct control)",
      description: "The core Simulang API Sai direct control runs.",
      mimeType: "text/markdown"
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: SIMULANG_REFERENCE }]
    })
  );
  mcp.registerTool(
    "sai_control_open",
    {
      description: controlToolDescriptions.sai_control_open,
      inputSchema: controlToolSchemas.sai_control_open
    },
    (args) => run2(async () => {
      const c = await api.controlOpen(args.machine_id);
      return { machine_id: c.machineId, expires_after_idle_s: c.expiresAfterIdleSec };
    })
  );
  mcp.registerTool(
    "sai_control_exec",
    {
      description: controlToolDescriptions.sai_control_exec,
      inputSchema: controlToolSchemas.sai_control_exec
    },
    async (args) => {
      try {
        const timeoutMs = (args.timeout_s ?? EXEC_DEFAULT_S) * 1e3;
        return execToolResult(await api.controlExec(args.machine_id, args.code, timeoutMs));
      } catch (err) {
        return fail2(err);
      }
    }
  );
  mcp.registerTool(
    "sai_control_interrupt",
    {
      description: controlToolDescriptions.sai_control_interrupt,
      inputSchema: controlToolSchemas.sai_control_interrupt
    },
    (args) => run2(() => api.controlInterrupt(args.machine_id))
  );
  mcp.registerTool(
    "sai_control_close",
    {
      description: controlToolDescriptions.sai_control_close,
      inputSchema: controlToolSchemas.sai_control_close
    },
    (args) => run2(async () => {
      await api.controlClose(args.machine_id);
      return { ok: true };
    })
  );
}

// src/osworld.ts
var osworldToolSchemas = {
  osworld_start: {
    task_id: external_exports.string().regex(/^\d{3}$/).describe('OSWorld V2.1 task id, "001" to "108".')
  },
  osworld_ask_user: {
    attempt_id: external_exports.string().min(1).describe("attempt_id from osworld_start."),
    question: external_exports.string().min(1).max(4e3).describe("What to ask the task\u2019s user.")
  },
  osworld_submit: {
    attempt_id: external_exports.string().min(1).describe("attempt_id from osworld_start."),
    outcome: external_exports.enum(["done", "fail"]).optional().describe(
      '"done" (default): you did the task. "fail": you concluded the task cannot be done as asked; some tasks are infeasible on purpose and are graded on that verdict.'
    )
  },
  osworld_abandon: {
    attempt_id: external_exports.string().min(1).describe("attempt_id from osworld_start.")
  }
};
var osworldToolDescriptions = {
  osworld_start: 'Start an OSWorld task: a fresh cloud computer is created for you and the task is set up on it (waits until it is ready, often several minutes). Returns { attempt_id, state, machine_id, instruction, has_user }; state "failed" (with a reason) means the setup did not complete and you can start again. Then do the task on that computer: sai_control_open { machine_id } and sai_control_exec blocks of Simulang, and sai_control_close when you are done. Work only from the instruction and what you observe on the computer: do not look for the task\u2019s files, configs, graders or reference results anywhere else. One attempt at a time: submit or abandon the current one before starting another.',
  osworld_ask_user: "Ask the task\u2019s user a question, when osworld_start returned has_user: true and the instruction leaves something for them to decide. Returns { answer }.",
  osworld_submit: 'Grade the attempt in the computer\u2019s current state and release the computer. Call it once, when you are done, with outcome "fail" if you concluded the task cannot be done. Close control first. Returns { score, state }.',
  osworld_abandon: "End the attempt without grading and free its computer. Use it to restart a task: abandon, then osworld_start again for a fresh computer. Close control first. Returns { state }."
};
var osworldInstructions = [
  "",
  "OSWorld: osworld_start \u2192 work the task on its machine_id through direct control \u2192 osworld_submit (osworld_abandon to restart)."
].join("\n");
var POLL_MS = 5e3;
var START_DEADLINE_MS = 25 * 6e4;
async function startAndWait(api, taskId, clock = {
  now: Date.now,
  sleep: (ms) => new Promise((resolve3) => setTimeout(resolve3, ms))
}) {
  const deadline = clock.now() + START_DEADLINE_MS;
  let attempt = await api.osworldStart(taskId);
  while (attempt.state === "starting") {
    if (clock.now() >= deadline)
      throw new Error(
        `OSWorld attempt ${attempt.attemptId} is still starting after ${START_DEADLINE_MS / 6e4} minutes. It ends on its own; try osworld_start again later.`
      );
    await clock.sleep(POLL_MS);
    attempt = await api.osworldGet(attempt.attemptId);
  }
  return attempt;
}
function attemptView(a) {
  return {
    attempt_id: a.attemptId,
    task_id: a.taskId,
    state: a.state,
    machine_id: a.machineId,
    instruction: a.instruction,
    has_user: a.hasUser,
    score: a.score,
    ...a.reason && { reason: a.reason }
  };
}
function registerOsworldTools(mcp, api, run2) {
  mcp.registerTool(
    "osworld_start",
    {
      description: osworldToolDescriptions.osworld_start,
      inputSchema: osworldToolSchemas.osworld_start
    },
    (args) => run2(async () => attemptView(await startAndWait(api, args.task_id)))
  );
  mcp.registerTool(
    "osworld_ask_user",
    {
      description: osworldToolDescriptions.osworld_ask_user,
      inputSchema: osworldToolSchemas.osworld_ask_user
    },
    (args) => run2(() => api.osworldAskUser(args.attempt_id, args.question))
  );
  mcp.registerTool(
    "osworld_submit",
    {
      description: osworldToolDescriptions.osworld_submit,
      inputSchema: osworldToolSchemas.osworld_submit
    },
    (args) => run2(async () => attemptView(await api.osworldEvaluate(args.attempt_id, args.outcome)))
  );
  mcp.registerTool(
    "osworld_abandon",
    {
      description: osworldToolDescriptions.osworld_abandon,
      inputSchema: osworldToolSchemas.osworld_abandon
    },
    (args) => run2(async () => attemptView(await api.osworldAbandon(args.attempt_id)))
  );
}

// src/watcher.ts
function notificationFor(sessionId, result) {
  const meta = { session_id: sessionId, event: result.status };
  if (result.status === "needs_approval" && result.approval) {
    const a = result.approval;
    meta.approval_id = a.approvalId;
    if (a.approvalUrl) meta.approval_url = a.approvalUrl;
    const lines = [
      `Sai needs ${a.isLinkOnly ? "the human to complete a step" : "an approval"}: ${a.title}`
    ];
    if (a.description) lines.push(a.description);
    if (a.command) lines.push(`Command: ${a.command}${a.cwd ? ` (in ${a.cwd})` : ""}`);
    if (a.isLinkOnly && a.approvalUrl) lines.push(`Open: ${a.approvalUrl}`);
    else lines.push(`Decide with sai_task_approve { approval_id: "${a.approvalId}" }.`);
    if (result.text) lines.push("", "Text so far:", result.text);
    return { content: lines.join("\n"), meta };
  }
  if (result.status === "error") {
    return {
      content: `Sai task failed: ${result.error ?? "unknown error"}${result.text ? `

Text so far:
${result.text}` : ""}`,
      meta
    };
  }
  return { content: result.text || "(Sai finished the task without a text reply.)", meta };
}
function watchSession(sessionId, deps) {
  const log2 = deps.log ?? (() => {
  });
  const pollMs = deps.pollMs ?? 6e4;
  const announced = /* @__PURE__ */ new Set();
  return (async () => {
    let cursor;
    for (; ; ) {
      let result;
      try {
        result = await deps.source.wait(sessionId, {
          timeoutMs: pollMs,
          ...cursor !== void 0 && { cursor },
          waitWhile: announced.size > 0 ? ["running", "needs_approval"] : ["running"]
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log2(`watch ${sessionId}: wait failed: ${message}`);
        await deps.notify({
          content: `Lost track of Sai session ${sessionId}: ${message}`,
          meta: { session_id: sessionId, event: "error" }
        });
        return;
      }
      cursor = result.cursor;
      if (result.status === "running") continue;
      if (result.status === "needs_approval") {
        const id = result.approval?.approvalId;
        if (!id || announced.has(id)) continue;
        announced.add(id);
        const decorated = result.approval ? { ...result, approval: await deps.withUrl(result.approval) } : result;
        await deps.notify(notificationFor(sessionId, decorated));
        continue;
      }
      await deps.notify(notificationFor(sessionId, result));
      return;
    }
  })();
}

// src/local-view.ts
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
var LOCAL_VIEW_TOOLS = [
  "sai_view_poll",
  "sai_view_live",
  "sai_view_save",
  "sai_task_approve"
];
var MAX_BODY = 2 * 1024 * 1024;
var CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  `connect-src 'self' ${LIVE_ORIGINS.join(" ")}`,
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join("; ");
var LocalView = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  token = randomBytes(24).toString("hex");
  listening;
  /** The page for one task; starts the listener on first use. */
  async urlFor(sessionId, machineId2, taskId) {
    const port = await this.port();
    const q = new URLSearchParams({ s: sessionId, m: machineId2, k: taskId, t: this.token });
    return `http://127.0.0.1:${port}/task?${q}`;
  }
  port() {
    this.listening ??= new Promise((resolve3, reject) => {
      const server = createServer((req, res) => {
        this.handle(req, res, server.address().port).catch((err) => {
          this.deps.log(`local view: ${err instanceof Error ? err.message : String(err)}`);
          if (!res.headersSent) send(res, 500, "text/plain", "Internal error");
        });
      });
      server.once("error", (err) => {
        this.listening = void 0;
        reject(err);
      });
      server.listen(0, "127.0.0.1", () => {
        server.unref();
        resolve3(server.address().port);
      });
    });
    return this.listening;
  }
  tokenOk(given) {
    if (!given) return false;
    const a = Buffer.from(given);
    const b = Buffer.from(this.token);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  async handle(req, res, port) {
    const origin = `http://127.0.0.1:${port}`;
    if (req.headers.host !== `127.0.0.1:${port}`) return send(res, 421, "text/plain", "Wrong host");
    const url = new URL(req.url ?? "/", origin);
    if (req.method === "GET" && url.pathname === "/task") {
      if (!this.tokenOk(url.searchParams.get("t"))) return send(res, 403, "text/plain", "Forbidden");
      return send(res, 200, "text/html; charset=utf-8", this.deps.html(), {
        "Content-Security-Policy": CSP
      });
    }
    if (req.method === "POST" && url.pathname === "/tool") {
      const token = req.headers["x-sai-token"];
      if (req.headers.origin !== origin || !this.tokenOk(typeof token === "string" ? token : null))
        return send(res, 403, "text/plain", "Forbidden");
      if (!String(req.headers["content-type"]).startsWith("application/json"))
        return send(res, 415, "text/plain", "JSON only");
      const body = await readBody(req);
      if (body === null) return send(res, 413, "text/plain", "Too large");
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return send(res, 400, "text/plain", "Bad JSON");
      }
      const name = parsed.name;
      if (typeof name !== "string" || !LOCAL_VIEW_TOOLS.includes(name))
        return send(res, 404, "text/plain", "Unknown tool");
      const args = parsed.arguments && typeof parsed.arguments === "object" ? parsed.arguments : {};
      const result = await this.deps.call(name, args);
      return send(res, 200, "application/json", JSON.stringify(result));
    }
    send(res, 404, "text/plain", "Not found");
  }
};
function send(res, status, type, body, extra = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    // The page URL carries the token: never leak it in a Referer.
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extra
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve3, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        resolve3(null);
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve3(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// src/task-log.ts
import { randomBytes as randomBytes2 } from "node:crypto";
var MAX_TASKS = 50;
var TaskLog = class {
  tasks = /* @__PURE__ */ new Map();
  latest = /* @__PURE__ */ new Map();
  /** A new task on `sessionId`: it becomes that session's live one. */
  start(sessionId) {
    const taskId = randomBytes2(9).toString("base64url");
    this.tasks.set(taskId, { sessionId });
    this.latest.set(sessionId, taskId);
    while (this.tasks.size > MAX_TASKS) {
      const oldest = this.tasks.keys().next().value;
      this.tasks.delete(oldest);
    }
    return taskId;
  }
  /** `live`: still its session's newest task; `archived`: a newer one started; `expired`: unknown. */
  state(taskId, sessionId) {
    const task = this.tasks.get(taskId);
    if (!task || task.sessionId !== sessionId) return "expired";
    return this.latest.get(sessionId) === taskId ? "live" : "archived";
  }
  saved(taskId) {
    return this.tasks.get(taskId)?.saved;
  }
  save(taskId, snapshot2) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.saved = snapshot2;
    return true;
  }
};

// src/init-claude.ts
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";
var SKILL_NAME = "sai";
var MANIFEST_FILE = ".sai-mcp-skill.json";
function parseInitClaudeFlags(argv) {
  const options = { project: false, check: false, force: false };
  for (const arg of argv) {
    if (arg === "--project") options.project = true;
    else if (arg === "--user") options.project = false;
    else if (arg === "--check") options.check = true;
    else if (arg === "--force") options.force = true;
    else return { ok: false, error: `Unknown flag: ${arg}` };
  }
  if (options.check && options.force) {
    return { ok: false, error: "--check and --force are mutually exclusive." };
  }
  return { ok: true, options };
}
function defaultSkillSource() {
  return resolve2(dirname(fileURLToPath(import.meta.url)), "..", "SKILL.md");
}
function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}
function readManifest(dir) {
  try {
    const parsed = JSON.parse(readFileSync(join(dir, MANIFEST_FILE), "utf8"));
    return typeof parsed.version === "string" && typeof parsed.contentHash === "string" ? parsed : null;
  } catch {
    return null;
  }
}
function runInitClaude(options, env) {
  const out = env.out ?? ((line) => process.stdout.write(`${line}
`));
  const base = options.project ? env.cwd ?? process.cwd() : env.homeDir ?? homedir();
  const dir = join(base, ".claude", "skills", SKILL_NAME);
  const target = join(dir, "SKILL.md");
  const template = readFileSync(env.skillSource ?? defaultSkillSource(), "utf8");
  const manifest = readManifest(dir);
  const existing = existsSync(target) ? readFileSync(target, "utf8") : void 0;
  if (options.check) {
    if (existing === void 0) {
      out(`sai-mcp: no skill installed at ${dir}`);
      return 1;
    }
    if (!manifest || hash(existing) !== hash(template)) {
      out(
        `sai-mcp: skill at ${dir} differs from ${env.version} \u2014 run \`sai-mcp init-claude\` to update.`
      );
      return 1;
    }
    out(`sai-mcp: skill at ${dir} is up to date (${manifest.version}).`);
    return 0;
  }
  if (existing !== void 0 && !options.force) {
    const ours = manifest !== null && hash(existing) === manifest.contentHash;
    if (!ours) {
      out(
        `sai-mcp: ${target} was changed or not written by sai-mcp; leaving it. Re-run with --force to overwrite.`
      );
      return 1;
    }
    if (manifest.contentHash === hash(template)) {
      out(`sai-mcp: skill at ${dir} is already up to date (${manifest.version}).`);
      return 0;
    }
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, template);
  const next = {
    version: env.version,
    contentHash: hash(template),
    installedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeFileSync(join(dir, MANIFEST_FILE), `${JSON.stringify(next, null, 2)}
`);
  out(`sai-mcp: installed the ${SKILL_NAME} skill (${env.version}) at ${dir}`);
  out("Add the MCP server too, if you have not:");
  out("  claude mcp add sai -e SAI_API_KEY=sapi_... -- npx -y @simular-ai/sai-mcp");
  return 0;
}

// src/server.ts
var SERVER_NAME = "sai";
var SERVER_VERSION = "0.3.0";
var log = (line) => {
  process.stderr.write(`[sai-mcp] ${line}
`);
};
function ok(result) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result
  };
}
function fail(err) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: message }], isError: true };
}
async function run(fn) {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(err);
  }
}
function createServer2() {
  const config = readConfig();
  const api = new SaiApi(config.apiUrl, config.apiKey, void 0, config.versionTag);
  const source = config.eventsApi ? new EventsPoller(api) : new StreamCollector(api, log);
  log(
    `api=${config.apiUrl} transport=${config.eventsApi ? "events-api" : "sse-collect"} push=${config.push}`
  );
  const mcp = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        // Always declared (§8): presence registers Claude Code's channel
        // listener; harmless on clients that do not know it.
        experimental: { "claude/channel": {} },
        tools: {}
      },
      instructions: serverInstructions + (config.control ? controlInstructions : "") + (config.osworld ? osworldInstructions : "")
    }
  );
  let userIdPromise;
  const userId = () => {
    userIdPromise ??= api.auth().then(
      (r) => r.userId,
      (err) => {
        log(`auth lookup failed: ${err instanceof Error ? err.message : String(err)}`);
        userIdPromise = void 0;
        return void 0;
      }
    );
    return userIdPromise;
  };
  const notify = async (n) => {
    await mcp.server.notification({
      method: "notifications/claude/channel",
      params: n
    });
  };
  const tools = new SaiTools({
    api,
    source,
    push: config.push,
    userId,
    onSessionStarted: (sessionId) => {
      void watchSession(sessionId, {
        source,
        notify,
        withUrl: (a) => tools.withUrl(a),
        log
      });
    }
  });
  const taskLog = new TaskLog();
  const viewDeps = {
    tasks: taskLog,
    // The view wants each step as it happens, not just the end of the turn.
    wait: (args) => tools.wait(args, { returnOnEvents: true }),
    apiUrl: config.apiUrl,
    run,
    liveScreen: (machineId2) => api.liveScreen(machineId2)
  };
  const viewTools = taskViewTools(viewDeps);
  const localView = config.localView ? new LocalView({
    html: taskViewHtml,
    call: (name, args) => name === "sai_task_approve" ? run(() => tools.approve(external_exports.object(toolSchemas.sai_task_approve).parse(args))) : viewTools[name](args),
    log
  }) : void 0;
  mcp.registerTool(
    "sai_machines",
    { description: toolDescriptions.sai_machines, inputSchema: toolSchemas.sai_machines },
    () => run(() => tools.machines())
  );
  mcp.registerTool(
    "sai_models",
    { description: toolDescriptions.sai_models, inputSchema: toolSchemas.sai_models },
    () => run(() => tools.models())
  );
  mcp.registerTool(
    "sai_task_start",
    {
      description: toolDescriptions.sai_task_start,
      inputSchema: toolSchemas.sai_task_start,
      // MCP Apps hosts render the live task view under this call.
      _meta: TASK_VIEW_TOOL_META
    },
    (args) => run(async () => {
      const started = await tools.start(args);
      const taskId = taskLog.start(started.session_id);
      const watchUrl = await localView?.urlFor(started.session_id, started.machine_id, taskId).catch((err) => {
        log(`local view unavailable: ${err instanceof Error ? err.message : String(err)}`);
        return void 0;
      });
      return { ...started, task_id: taskId, ...watchUrl && { watch_url: watchUrl } };
    })
  );
  mcp.registerTool(
    "sai_task_wait",
    { description: toolDescriptions.sai_task_wait, inputSchema: toolSchemas.sai_task_wait },
    (args) => run(() => tools.wait(args))
  );
  mcp.registerTool(
    "sai_task_approve",
    { description: toolDescriptions.sai_task_approve, inputSchema: toolSchemas.sai_task_approve },
    (args) => run(() => tools.approve(args))
  );
  mcp.registerTool(
    "sai_task_abort",
    { description: toolDescriptions.sai_task_abort, inputSchema: toolSchemas.sai_task_abort },
    (args) => run(() => tools.abort(args))
  );
  mcp.registerTool(
    "sai_upload",
    { description: toolDescriptions.sai_upload, inputSchema: toolSchemas.sai_upload },
    (args) => run(() => tools.upload(args))
  );
  registerTaskView(mcp, viewDeps);
  if (config.control) registerControlTools(mcp, api, run, fail);
  if (config.osworld) registerOsworldTools(mcp, api, run);
  return mcp;
}
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "--version" || command === "-v") {
    process.stdout.write(`${SERVER_VERSION}
`);
    return;
  }
  if (command === "init-claude") {
    const parsed = parseInitClaudeFlags(rest);
    if (!parsed.ok) {
      process.stderr.write(`sai-mcp: ${parsed.error}
`);
      process.exit(2);
    }
    process.exit(runInitClaude(parsed.options, { version: SERVER_VERSION }));
  }
  const mcp = createServer2();
  await mcp.connect(new StdioServerTransport());
}
main().catch((err) => {
  log(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
export {
  SERVER_NAME,
  SERVER_VERSION,
  createServer2 as createServer
};
