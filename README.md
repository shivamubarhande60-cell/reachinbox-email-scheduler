# ReachInbox email scheduler

A small full-stack email scheduler built for the ReachInbox hiring assignment. It uses Express and BullMQ for the API and background work, MySQL for email records, Redis for the queue and rate-limit counters, and Ethereal for test email delivery.

## What is included

- Google OAuth sign-in, a user-specific dashboard, and logout.
- Framer Motion sign-in entrance and staggered workflow steps; buttons have no hover movement.
- CSV/text recipient upload, compose form, scheduled and sent lists, and search.
- Persistent delayed jobs in BullMQ, a Bull Board page, and startup recovery from MySQL.
- Environment-configured and dashboard-managed SMTP senders, configurable worker concurrency, minimum send spacing, and per-sender hourly limits.
- Slack OAuth connection and a direct Slack message when a sender reaches its hourly limit.
- Elasticsearch indexing and search with a database fallback when Elasticsearch is temporarily unavailable.

The dashboard is a student assignment demo, not a production bulk-mail service. Use test addresses and check the external provider limits before sending anything.

## Run locally

Use Node.js 20 or later, npm, and Docker Compose.

1. Start Redis, MySQL, and Elasticsearch from the project root:

   ```powershell
   docker compose up -d
   ```

2. In `backend`, copy `.env.example` to `.env` and set the required values. Create a long random session secret and a 32-byte encryption key:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Run that command once for `SESSION_SECRET` and again for `TOKEN_ENCRYPTION_KEY`. Keep `.env` private.

3. Create an Ethereal test account at [ethereal.email](https://ethereal.email/). You can either add its SMTP host, port, user, and password to `SMTP_SENDERS` as JSON, or connect it from **Senders** in the dashboard. Dashboard-managed accounts are verified before saving; their passwords are encrypted with AES-256-GCM using `TOKEN_ENCRYPTION_KEY`. Environment-configured senders are read-only in the dashboard.

4. Create a Google OAuth web client. Add `http://localhost:5000/auth/google/callback` as an authorized redirect URI, and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

5. Create a Slack app. Enable OAuth, add `http://localhost:5000/auth/slack/callback` as a redirect URL, request the bot scopes `chat:write` and `im:write`, install the app to a test workspace, and set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`. The app sends rate-limit notifications as a direct message to the Slack user who connected it. Slack is optional; email scheduling still works when it is not connected.

6. Install and start the backend:

   ```powershell
   cd backend
   npm install
   npm run db:generate
   npm run db:push
   npm run dev
   ```

   The API and workers run together at `http://localhost:5000`. The Bull Board queue view is at `http://localhost:5000/admin/queues` after Google sign-in.

   For a local UI preview before Google OAuth is configured, set `ENABLE_LOCAL_DEMO_LOGIN=true` in `backend/.env` and restart the backend. The preview route only works for loopback requests outside production, is labeled in the dashboard, and can schedule email only through Ethereal SMTP. Turn it off before sharing or deploying the app. This preview is not a substitute for the assignment's real Google OAuth requirement.

7. In a second terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. If Vite falls back to `http://localhost:5175` because port 5173 is occupied, the local-development API accepts either origin. In production, set backend `FRONTEND_URL` to the exact frontend origin. If the backend is hosted elsewhere, set `VITE_API_URL` in the frontend environment to its URL.

## Environment settings

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string; Compose publishes MySQL on port 3307. |
| `REDIS_URL` | Optional hosted Redis connection URL; takes precedence over `REDIS_HOST` and `REDIS_PORT`. Supports `redis://` and `rediss://` URLs. |
| `REDIS_HOST`, `REDIS_PORT` | Redis host and port used when `REDIS_URL` is unset. |
| `SESSION_SECRET` | HMAC key for the HTTP-only login cookie; use at least 32 random characters. |
| `SESSION_COOKIE_SAME_SITE` | Session-cookie policy: `lax` by default, or `none` for a frontend and API hosted on different sites. `none` requires HTTPS. |
| `ENABLE_LOCAL_DEMO_LOGIN` | Enables local-only dashboard preview outside production; default: false. |
| `TOKEN_ENCRYPTION_KEY` | 64-character hex key used to encrypt saved Slack OAuth tokens and dashboard-managed SMTP passwords with AES-256-GCM. Back it up securely; changing it makes existing saved credentials unreadable. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth credentials and callback. |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_CALLBACK_URL` | Slack OAuth credentials and callback. |
| `SMTP_SENDERS` | JSON array of sender configs (`id`, `name`, `from`, `host`, `port`, `user`, `pass`). |
| `DEMO_EMAIL_MODE` | Set to `true` to use a built-in simulated sender and process queue jobs without SMTP. Dashboard rows are marked **Simulated** and no email is sent. Default: false. |
| `WORKER_CONCURRENCY` | Number of email jobs a worker can process concurrently. Default: 5. |
| `EMAIL_DELAY_MS` | Minimum delay in milliseconds between send starts for each sender. Default: 2000. |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Maximum emails for a sender in one UTC hour. Default: 200. |
| `ELASTICSEARCH_NODE` | Elasticsearch URL. Default: `http://localhost:9200`. |
| `ELASTICSEARCH_API_KEY` | Optional Elasticsearch API key for a hosted Elasticsearch cluster. Alternatively, set both `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD`. |

The compose file stores Redis AOF data, MySQL data, and Elasticsearch data in named volumes.

## Deploy to Render

The root [Dockerfile](./Dockerfile) builds the backend and frontend into one Render web service. Serving both on one HTTPS origin avoids cross-site session-cookie restrictions. Render Key Value can provide Redis; Render does not provide managed MySQL, so use a hosted MySQL provider and set its connection string as `DATABASE_URL`.

Render's free web instances can spin down while idle, so they are not suitable for reliably sending scheduled emails around the clock. Free web services also cannot send outbound SMTP traffic on ports 25, 465, or 587. To demonstrate scheduling on a free web service, set `DEMO_EMAIL_MODE=true`: queue processing, throttling, persistence, and dashboard tracking run normally, but deliveries are simulated and no emails are sent. Use an always-on web instance and a plan that permits outbound SMTP for real email sending; these may incur charges.

1. Create a Render **Key Value** service in the same region as the web service. Choose a persistent plan suitable for BullMQ data; do not use an ephemeral Redis instance for scheduled jobs.
2. Create a Render **Web Service** from this private GitHub repository. Use the repository root and Docker runtime so Render builds the root `Dockerfile`. Add `REDIS_URL` using the Key Value service's internal connection URL, and add `DATABASE_URL` from a hosted MySQL database reachable from Render.
3. Set the required environment values in the Render dashboard: `SESSION_SECRET` (at least 32 random characters), `TOKEN_ENCRYPTION_KEY` (64 hex characters), Google and Slack OAuth credentials, and `ELASTICSEARCH_NODE` plus an API key or username/password if using hosted Elasticsearch. For a Render Free demo, set `DEMO_EMAIL_MODE=true` and omit SMTP sender credentials. For actual SMTP delivery, use a service plan that permits SMTP egress and configure `SMTP_SENDERS`. Keep credentials in Render's secret environment settings.
4. Deploy and open the generated `https://<service>.onrender.com` URL. `FRONTEND_URL` and the OAuth callback URLs default to that Render URL when their explicit variables are omitted. Add `https://<service>.onrender.com/auth/google/callback` and `https://<service>.onrender.com/auth/slack/callback` to the corresponding Google and Slack app settings. If you set callback URL variables explicitly, they must match those exact URLs.
5. The container runs `npm run db:push` before starting the API, creating/updating the Prisma schema in the configured MySQL-compatible database. The Docker build generates Prisma Client and builds both frontend and backend; Render supplies `PORT`.
6. Check `https://<service>.onrender.com/health`, sign in, schedule a demo campaign, verify queue status, and test search. In simulated mode the emails are marked **Simulated**, not sent. Leave `SESSION_COOKIE_SAME_SITE` unset (`lax`) for this same-origin setup.

If deploying the frontend separately on Vercel instead, set its `VITE_API_URL` to the Render API URL, set Render's `FRONTEND_URL` to the Vercel origin, and use `SESSION_COOKIE_SAME_SITE=none` over HTTPS. Some browsers restrict cross-site cookies; using the single-origin Render deployment above avoids that issue. Keep all provider data services running with persistent storage so delayed jobs survive restarts.

### Managing senders

Open **Senders** from the sidebar or dashboard header to add or remove SMTP accounts. New accounts are connection-tested before the server stores them. The API never returns SMTP usernames or passwords. Managed sender records belong to the signed-in user, and their SMTP passwords are encrypted in MySQL. The sender's hourly cap cannot exceed `MAX_EMAILS_PER_HOUR_PER_SENDER` (default 200), and its minimum delay cannot be lower than `EMAIL_DELAY_MS` (default 2 seconds). Removing a sender is blocked while it has emails waiting or sending. Senders supplied through `SMTP_SENDERS` remain available to all signed-in users on the instance and cannot be removed from the dashboard. When `DEMO_EMAIL_MODE=true`, the app instead exposes a built-in simulated sender and does not require SMTP settings.

## Scheduling and recovery

The schedule endpoint writes the campaign and recipient rows to MySQL before it adds BullMQ jobs. BullMQ delayed jobs hold their due time in Redis; the app does not use cron. Each lead's queue job has a stable job ID, so retries or a repeated API request with the same `Idempotency-Key` do not create a second queue job. On startup, the app re-adds jobs for pending database rows; this covers a process stopping between the database write and the queue write.

The worker and API run in the same process for this assignment. BullMQ owns job state and locks in Redis, and the worker uses `WORKER_CONCURRENCY` for parallelism. During graceful shutdown the process waits for in-flight workers to close. If a process is killed unexpectedly while an email is marked `SENDING`, the app marks its outcome uncertain and does not retry that email: SMTP does not provide a transaction that can guarantee exactly-once delivery across a crash after the receiving server accepts a message.

## Throttling and load behavior

Workers use a short Redis lock per sender to serialize that sender's SMTP calls across app instances. If an email was sent too recently, the job waits in BullMQ until the minimum gap has passed instead of sleeping in a worker. Hourly capacity is reserved by an atomic Redis Lua script. The effective gap is the larger of the configured minimum (`EMAIL_DELAY_MS`) and the campaign's requested delay.

Hourly limits use UTC hour windows. Both the configured sender-wide ceiling and the campaign's lower requested ceiling are checked before sending. When capacity is reached, the job is moved to the next UTC hour; it remains in the queue and is checked again then. Redis atomically identifies the reservation that consumes the sender's final allowed slot and triggers one Slack direct message per connected user and sender in that window. With 1,000 emails scheduled for the same time, workers process up to the configured concurrency, Redis serializes each sender, and excess work stays delayed in BullMQ instead of being dropped.
If Slack is temporarily unavailable, the notification reservation is released so a later rate-limit hit can retry the alert.

This is a fixed-window limiter, so capacity becomes available at the next UTC hour boundary. Redis AOF and the Compose volume preserve the counters and delayed jobs across container restarts. Avoid deleting the named volumes if you want to retain queued work and database records.

## Search and indexing

Newly scheduled and sent/failed leads are written to the Elasticsearch `emails` index through a separate BullMQ index queue. Index work is retried independently so an Elasticsearch outage does not cause an already-sent email to be resent. The dashboard's search field calls the Elasticsearch-backed API; if Elasticsearch is unavailable, the API reports the fallback source and searches MySQL.

## Assignment feature map

### Backend

- **Scheduling:** Express API validates the request, persists the campaign and recipient rows in MySQL, and adds per-recipient delayed BullMQ jobs to Redis. No cron scheduler is used.
- **Restart recovery and idempotency:** Redis AOF persists queue state, while startup recovery re-enqueues pending rows from MySQL with stable per-lead job IDs. Schedule requests require an `Idempotency-Key`. An email with an uncertain SMTP outcome is not retried, to avoid a possible duplicate.
- **Concurrency and pacing:** `WORKER_CONCURRENCY` configures BullMQ worker concurrency. A Redis sender lock serializes sends per sender, and `EMAIL_DELAY_MS` enforces a minimum gap between sends.
- **Hourly limits:** An atomic Redis Lua reservation enforces configurable per-sender and per-campaign hourly caps across workers. Capacity-limited jobs are delayed to the next UTC hour instead of discarded.
- **SMTP and alerts:** Ethereal SMTP is supported for test delivery where outbound SMTP is allowed. `DEMO_EMAIL_MODE=true` provides a no-SMTP Render demo in which queue jobs finish with an explicit simulated status and no email is sent. Optional Slack OAuth sends an alert when a sender reaches its configured hourly cap.
- **Search and queue visibility:** Elasticsearch indexes email records with a MySQL fallback; Bull Board exposes live BullMQ queue status to signed-in users.

### Frontend

- **Sign-in:** Google OAuth login, profile display, and logout; a clearly labeled local-only preview is available when explicitly enabled.
- **Dashboard:** Scheduled and sent/failed email views, campaign list and details, needs-attention filtering, search, and refresh.
- **Compose and senders:** Compose campaigns with subject/body, recipient CSV/text upload, start time and pacing settings. Manage SMTP senders in the dashboard; credentials are verified before saving and never returned by the API.
- **Status and feedback:** Loading, empty, error, and success states for dashboard operations.

## Assumptions and trade-offs

- Ethereal is a fake SMTP service for demonstrations; it does not represent production inbox delivery.
- Simulated delivery is explicitly labeled and must not be presented as an email actually sent or delivered.
- Redis AOF and named Compose volumes are required to retain BullMQ delayed jobs across container restarts. Startup recovery from MySQL covers pending jobs if the app stopped between the database write and queue insertion.
- The hourly limit uses a fixed UTC-hour window. Unused capacity does not carry over, and queued work waits until the next hour when the cap is reached.
- Sends for a given sender are serialized to enforce provider pacing even though different senders can work concurrently.
- SMTP and MySQL/Redis cannot participate in one shared transaction. If the app stops after SMTP accepts a message but before MySQL records success, delivery may be uncertain; the worker avoids retrying that email to reduce duplicate risk. Therefore strict exactly-once delivery cannot be guaranteed.
- This is a single-process API/worker deployment for the assignment. Redis-backed locks/counters coordinate multiple worker instances, but production operation would require additional monitoring, secret management, and operational controls.

## Useful checks

```powershell
cd backend
npm run build
npm test
npm run test:redis

cd ..\frontend
npm run build
npm run lint
```

The Redis checks cover concurrent sender/campaign hourly limits and verify that 1,000 delayed BullMQ jobs remain queued after the queue client reconnects. The reconnect test uses a temporary queue and removes it after the test.
