# Local Reddit browser worker

This worker lets the local Miloosh task bridge perform a small, explicit set of Reddit actions through an authenticated Chrome session. It does not use Reddit's posting API and never accepts or reads a password. It launches the installed Chrome normally with a loopback-only Chrome DevTools Protocol port, then Playwright attaches over CDP; this avoids putting Google login inside a Playwright-launched browser.

## Local state

- Browser profile: `~/.local/share/miloosh-reddit-worker/chrome-profile`
- Local CDP endpoint: `127.0.0.1:9225`
- Successful-write audit log: `~/.local/share/miloosh-reddit-worker/logs/actions.jsonl`
- Worker: `scripts/reddit/worker.ts`

The profile and log remain local and are not part of the repository or bridge outbox. Do not copy or inspect the profile: Chrome owns the cookies and browser storage inside it.

## First login and status

```sh
printf '%s\n' '{"command":"reddit_status","wait_for_login_seconds":300}' | npx tsx scripts/reddit/worker.ts
```

Chrome opens using the dedicated profile and remains available for later tasks. If the result is not already authenticated, log in manually in that Chrome window. Never put a password in a task file, terminal command, log, or chat. The CDP listener is bound to loopback only.

## Direct commands

```sh
printf '%s\n' '{"command":"reddit_open","thread_url":"https://www.reddit.com/r/SUBREDDIT/comments/ID/SLUG/"}' | npx tsx scripts/reddit/worker.ts
printf '%s\n' '{"command":"reddit_notifications"}' | npx tsx scripts/reddit/worker.ts
```

`reddit_reply` requires `thread_url` and exact `text`. `reddit_create_post` requires `subreddit`, exact `title`, and exact `body`. The worker never rewrites supplied copy. It stops on mandatory flair, CAPTCHA, verification, suspicious-login warnings, posting restrictions, and moderator warnings.

Every write additionally needs a short-lived, one-time approval created on this Mac for the exact JSON task:

```sh
npx tsx scripts/reddit/worker.ts --approve-task /absolute/path/to/miloosh_task_reddit_example.json
```

The approval expires after ten minutes and stores only the task's SHA-256 hash and expiry. Any copy change produces a different hash. The worker consumes the approval immediately before clicking Reddit's submit button; it will not retry an ambiguous submission.

## Bridge tasks

Place a structured task named `miloosh_task_reddit_<id>.json` in the existing bridge inbox:

```json
{
  "request_id": "example-1",
  "command": "reddit_open",
  "thread_url": "https://www.reddit.com/r/SUBREDDIT/comments/ID/SLUG/"
}
```

The bridge writes `result_miloosh_task_reddit_<id>.json` to its normal outbox and archives the input in `processed`. Reddit JSON tasks bypass the general Claude/Codex implementation loop; only the allowlisted worker contract executes.

Supported commands are `reddit_status`, `reddit_open`, `reddit_reply`, `reddit_create_post`, and `reddit_notifications`. Votes, DMs, joins/leaves, deletions, settings changes, and password fields are rejected.
