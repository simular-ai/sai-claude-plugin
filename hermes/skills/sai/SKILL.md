---
name: sai
description: Hand a task to Sai, a computer-use agent on a real Windows or macOS computer. Use when the user asks for something this environment cannot do itself - a web app behind a login, an admin console or vendor portal with no API, a desktop application, a form with no import, or reproducing what a real user sees in a browser.
---

# Hand a task to Sai

Sai does the task on a cloud computer by seeing the screen, clicking and typing, and reports back in text. Do not use it for work you can do locally with code or a documented API.

## The loop

1. **Start.** Call `sai_task_start` with the task in plain English. Write it the way you would brief a colleague: the goal, the site or app, and what to report back. It returns a `session_id` right away. Call `sai_machines` first only if the user has several computers and named one.
2. **Wait.** Call `sai_task_wait` with the `session_id` and repeat while the status is `running`. Share its progress lines with the user as short updates. A free account's first task of the day can stay `running` for about two minutes while the computer starts.
3. **On `needs_approval`.** If the request is something you can judge (a command, a file write) and it is what the user asked for, answer with `sai_task_approve`: `approve`, `approve_for_task` when the same kind of request will repeat, or `deny` when it is outside the task. If it comes with a link (a sign-in, a password, a phone check), only the user can do it: give them the link with one sentence on what it is for, wait until they say they are done, then go back to step 2.
4. **On `idle`.** The task is done. Report Sai's answer, then summarise it if it is long.
5. **On `error`.** Report the error. Do not retry on your own. If it says the credit or the free plan's daily computer time is used up, tell the user and stop for today.

If the user cancels, call `sai_task_abort`. To give Sai a local file, call `sai_upload` first and mention the file in the task.

Sai remembers earlier tasks on the same computer. Pass `new_session: true` to start fresh. Use `autonomous: true` only when the user wants the task done unattended.

## Watching

Each `sai_task_start` reply includes a `watch_url`. Offer it to the user: it shows the computer's screen live, Sai's steps and any permission requests.

The `watch_url` view never takes input. When Sai needs the user on the screen itself (a captcha, a sign-in inside a page), call `sai_live_link` and give them its `live_url`: they can use the mouse and keyboard there in a browser, with no Simular sign-in. Anyone with the link can use the computer until `expires_at`, so tell them not to share it. When they say they are done, send Sai a message to carry on.

## Replay as code

After a task works, the user can ask Sai to save it as a replayable skill with parameters ("Save this as invoice_export, with vendor and month as parameters"). Later runs replay that code and ask the model only where the screen matters.
