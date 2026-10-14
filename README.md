
# ReachInbox — Email Scheduler

**A full-stack email campaign scheduler built with React, Express, BullMQ, Redis, and MySQL.**

Schedule campaigns, manage SMTP senders, track background jobs, and search email records from one dashboard. Built for the ReachInbox hiring assignment, with a focus on reliable scheduling, rate limiting, recovery, and clear delivery status.

[**Live Demo**](https://reachinbox-email-scheduler-eaqb.onrender.com/) · [**Source Code**](https://github.com/shivamubarhande60-cell/reachinbox-email-scheduler)

> **Demo notice:** The hosted demo simulates email delivery because Render's free plan blocks outbound SMTP. No real emails are sent in simulated mode. Real test delivery was verified locally with Ethereal SMTP.

---

## ✨ Features

| Feature | Description |
|:---|:---|
| **Google OAuth** | Sign in, view a user-specific dashboard, and log out. |
| **Campaign Scheduling** | Compose email campaigns, upload recipients via CSV or text, and schedule delivery. |
| **Background Processing** | BullMQ delayed jobs backed by Redis, with queue visibility through Bull Board. |
| **Restart Recovery** | Re-enqueues pending work from MySQL when the application starts. |
| **Idempotency & Retries** | Stable job IDs and idempotency keys help prevent duplicate queue jobs. Uncertain SMTP outcomes are not blindly retried. |
| **Sender Management** | Configure SMTP senders, verify connections, and encrypt saved sender credentials. |
| **Rate Limiting** | Configurable worker concurrency, minimum send spacing, and per-sender hourly limits. |
| **Slack Notifications** | Optional Slack OAuth integration sends direct-message alerts when a sender reaches its hourly cap. |
| **Email Search** | Elasticsearch indexing with a MySQL fallback if Elasticsearch is unavailable. |
| **Queue Dashboard** | Inspect background-job status through Bull Board. |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React, TypeScript, Vite, Framer Motion |
| **Backend** | Node.js, Express |
| **Queue & Jobs** | BullMQ, Redis |
| **Database** | MySQL, Prisma |
| **Search** | Elasticsearch |
| **Authentication** | Google OAuth, session cookies |
| **Email** | SMTP, Ethereal test email service |
| **Integrations** | Slack OAuth |
| **Infrastructure** | Docker, Docker Compose, Render |

---

## 🏗️ Engineering Highlights

### Reliable background scheduling
Campaign and recipient records are written to MySQL before delayed BullMQ jobs are added to Redis. On startup, pending database records are checked and re-enqueued, covering interruptions between database writes and queue insertion.

### Idempotency and delivery safety
Stable per-recipient job IDs and API idempotency keys help prevent duplicate queue jobs. If an SMTP outcome becomes uncertain after a crash, the application avoids blindly retrying that email because SMTP and the database cannot share one atomic transaction.

### Distributed sender throttling
Redis-backed sender locks coordinate sending, while atomic Lua-script reservations enforce hourly limits across workers. Jobs that reach their limits wait for the next UTC hour rather than being discarded.

### Search isolation
Email indexing runs through a separate BullMQ queue. Elasticsearch indexing failures can be retried independently, so a search outage does not cause an already-sent email to be resent.

### Credential protection
Dashboard-managed SMTP passwords and saved Slack OAuth tokens are encrypted using AES-256-GCM. SMTP credentials are not returned through the API.

---

## 🚀 Run Locally

### Prerequisites

- Node.js 20 or later
- npm
- Docker and Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/shivamubarhande60-cell/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
```

### 2. Start the supporting services

From the project root:

```bash
docker compose up -d
```

This starts the Redis, MySQL, and Elasticsearch services defined in the Compose configuration.

### 3. Configure the backend

Copy `backend/.env.example` to `backend/.env` and configure the required environment variables.

Generate secure secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run the command separately for `SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY`.

Create an [Ethereal test email account](https://ethereal.email/) and configure its SMTP credentials. You can also add and verify a sender through the dashboard.

For Google sign-in, configure a Google OAuth web client with this local callback:

```text
http://localhost:5000/auth/google/callback
```

Slack OAuth is optional. To enable notifications, configure a Slack app and its OAuth callback:

```text
http://localhost:5000/auth/slack/callback
```

Keep all credentials in environment variables. Never commit `.env` files or expose secrets in frontend code.

### 4. Install and run the backend

```bash
cd backend
npm install
npm run db:generate
npm run db:push
npm run dev
```

The API and background workers run together at:

- API: `http://localhost:5000`
- Bull Board: `http://localhost:5000/admin/queues`

### 5. Start the frontend

Open a second terminal at the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

### 6. Configure optional integrations

| Variable | Purpose |
|:---|:---|
| `DATABASE_URL` | MySQL connection string |
| `REDIS_URL` | Hosted Redis connection URL, when used |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection settings when `REDIS_URL` is unset |
| `SESSION_SECRET` | Session-cookie signing secret |
| `TOKEN_ENCRYPTION_KEY` | 64-character hexadecimal encryption key |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` | Optional Slack OAuth credentials |
| `SMTP_SENDERS` | Optional JSON array of environment-configured SMTP senders |
| `DEMO_EMAIL_MODE` | Enables simulated delivery; no emails are sent |
| `WORKER_CONCURRENCY` | Worker concurrency; default `5` |
| `EMAIL_DELAY_MS` | Minimum send spacing; default `2000` ms |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Sender hourly cap; default `200` |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint |
| `ELASTICSEARCH_API_KEY` | Optional hosted Elasticsearch API key |

Refer to `backend/.env.example` for the full configuration required by your current code.

---

## ☁️ Deployment

The root `Dockerfile` builds the frontend and backend into a single Render web service.

For a hosted deployment, configure:

- A persistent Redis service for delayed jobs and rate-limit data.
- A hosted MySQL database.
- The required session, encryption, and OAuth credentials.
- Elasticsearch credentials if using a hosted cluster.

For a free Render demo, set:

```env
DEMO_EMAIL_MODE=true
```

The application can demonstrate queue processing, scheduling, throttling, persistence, and dashboard tracking without sending real email. Render free web services may spin down while idle, so they are not suitable for reliable, around-the-clock scheduled delivery.

For actual SMTP sending, use infrastructure that permits outbound SMTP and remains available when jobs are due.

---

## 🧪 Verification

From the backend directory:

```bash
npm run build
npm test
npm run test:redis
```

From the frontend directory:

```bash
npm run build
npm run lint
```

These commands are the project's documented verification checks; run them locally to confirm they pass in your environment.

---

## 📚 Project Documentation

- [Architecture](./ARCHITECTURE.md) — system structure and design decisions, if available.
- [Dockerfile](./Dockerfile) — container build configuration.
- [Docker Compose](./docker-compose.yml) — local supporting services.

---

## ⚖️ Scope & Limitations

ReachInbox is a hiring-assignment demonstration, not a production bulk-mail service. Ethereal is a test email service, simulated mode does not send messages, and strict exactly-once email delivery cannot be guaranteed across an uncertain SMTP outcome.

