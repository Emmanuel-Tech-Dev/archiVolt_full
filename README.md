# ⬡ Archivolt

> **Zero-knowledge, byte-interleaved file distribution across three independent cloud providers with RAID-5 style parity recovery — and a full-stack React dashboard to manage it.**

---

## Table of Contents

1. [What Is Archivolt?](#what-is-archivolt)
2. [How It Works](#how-it-works)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Tech Stack](#tech-stack)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Database Schema](#database-schema)
9. [Storage Drivers](#storage-drivers)
10. [Core Logic — storageManager.js](#core-logic--storagemanagerjs)
11. [API Reference](#api-reference)
12. [Frontend — Dashboard UI](#frontend--dashboard-ui)
13. [Frontend Pages](#frontend-pages)
14. [Fault Tolerance & Parity Recovery](#fault-tolerance--parity-recovery)
15. [Security Model](#security-model)
16. [Testing Guide](#testing-guide)

---

## What Is Archivolt?

Archivolt is a **multi-cloud file sharding system** with a purpose-built React dashboard. Instead of uploading a file to a single provider, Archivolt splits the file's raw bytes across three independent storage providers simultaneously. No single provider ever holds a complete, readable copy of the file.

If any one provider goes offline or is compromised, the file can still be fully reconstructed using a **XOR parity shard** stored locally — the same principle used in enterprise RAID-5 disk arrays.

**Key Properties:**

- **Zero-knowledge storage** — each cloud node holds only meaningless partial bytes
- **Fault tolerant** — survives the complete failure of any one cloud node
- **Memory-efficient** — uses Node.js streams throughout; never loads entire files into memory
- **Provider-agnostic** — the Strategy Pattern means swapping a provider requires changing one driver file
- **Full-stack** — a React + Vite dashboard lets you upload, monitor, and download from the browser

---

## How It Works

### Splitting (Upload)

Every file is split by interleaving its bytes across three shards:

```
Original bytes:  [B0, B1, B2, B3, B4, B5, B6, B7, B8 ...]

Shard A (Local):      [B0, B3, B6, ...]   ← bytes where i % 3 === 0
Shard B (Supabase):   [B1, B4, B7, ...]   ← bytes where i % 3 === 1
Shard C (Cloudinary): [B2, B5, B8, ...]   ← bytes where i % 3 === 2
Shard P (Parity):     [B0^B1^B2, B3^B4^B5, ...]   ← XOR of aligned bytes
```

A ledger entry is written to MySQL recording the storage key and provider for all four shards.

### Reconstructing (Download)

The server fetches all three data shards in parallel and weaves them back together:

```
Shard A: [B0, B3, B6]
Shard B: [B1, B4, B7]   →   [B0, B1, B2, B3, B4, B5, B6, B7, B8]
Shard C: [B2, B5, B8]
```

### Recovery (One Node Down)

If one shard is unavailable, the missing bytes are recovered via XOR:

```
Shard A missing?  →  A = Parity XOR B XOR C
Shard B missing?  →  B = Parity XOR A XOR C
Shard C missing?  →  C = Parity XOR A XOR B
```

This happens silently — the client receives the correct file with no error.

---

## Architecture Overview

```
                    ┌─────────────────────────────┐
                    │       React Dashboard         │
                    │  Vite · Ant Design · DM Mono  │
                    └────────────┬────────────────┘
                                 │ HTTP (proxied to :3000)
                    ┌────────────▼────────────────┐
                    │        Express Server         │
                    │         index.js             │
                    └──┬──────────┬───────────┬───┘
                       │          │           │
           ┌───────────▼──┐  ┌───▼──────┐  ┌▼──────────────┐
           │ storageManager│  │   db.js  │  │    drivers/    │
           │    .js        │  │  MySQL   │  │  local         │
           │  createShards │  │  Pool    │  │  supabase      │
           │  reconstruct  │  └──────────┘  │  cloudinary    │
           └───────────────┘                └────────────────┘
                   │
      ┌────────────┼─────────────┐
      │            │             │
┌─────▼────┐  ┌───▼──────┐  ┌──▼────────────┐  ┌──────────┐
│  Local    │  │ Supabase │  │  Cloudinary   │  │  Local   │
│  Shard A  │  │  Shard B │  │   Shard C     │  │ Parity P │
│ i%3 === 0 │  │ i%3 === 1│  │  i%3 === 2    │  │  XOR     │
└───────────┘  └──────────┘  └───────────────┘  └──────────┘
```

---

## Project Structure

```
archivolt/
│
├── archivolt-core/                 ← Backend (Express API)
│   ├── drivers/
│   │   ├── local.js                # Shard A — local disk (Node fs streams)
│   │   ├── supabase.js             # Shard B — Supabase Storage bucket
│   │   └── cloudinary.js           # Shard C — Cloudinary raw resource type
│   │
│   ├── storage/                    # Auto-created — local shard files live here
│   │
│   ├── storageManager.js           # Core: byte splitting & XOR reconstruction
│   ├── db.js                       # MySQL connection pool (mysql2/promise)
│   ├── index.js                   # Express API — routes & orchestration
│   │
│   ├── schema.sql                  # MySQL table definition (run once)
│   ├── package.json
│   ├── .env.example                # Template — copy to .env and fill in
│   └── .env                        # ← Never commit this
│
└── archivolt-ui/                   ← Frontend (React + Vite)
    ├── src/
    │   ├── main.jsx                # React entry point
    │   ├── App.jsx                 # Root layout — nav, tabs, footer
    │   ├── index.css               # CSS variables, Ant Design overrides, animations
    │   ├── api.js                  # Fetch helpers for all backend endpoints
    │   └── pages/
    │       ├── Dashboard.jsx       # Node status, mesh health, stats
    │       ├── Upload.jsx          # File drop zone & shard result display
    │       ├── Ledger.jsx          # Paginated file registry table
    │       └── Settings.jsx        # Config reference & shard architecture
    │
    ├── vite.config.js              # Dev proxy → http://localhost:3000
    └── package.json
```

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 4 |
| Database | MySQL + mysql2/promise |
| File Upload | Multer (memory storage) |
| Storage A | Local disk (Node fs) |
| Storage B | Supabase Storage |
| Storage C | Cloudinary v2 (raw resource type) |
| Config | dotenv |

### Frontend

| Layer | Technology |
|---|---|
| Build Tool | Vite |
| Framework | React 19 |
| Component Library | Ant Design (AntD) |
| Icons | @ant-design/icons |
| Typography | DM Mono + Syne (Google Fonts) |
| Styling | CSS custom properties (no Tailwind, no CSS-in-JS) |
| HTTP | Native `fetch` + `XMLHttpRequest` (upload progress) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+
- Supabase account
- Cloudinary account

---

### Backend Setup

#### 1. Install dependencies

```bash
cd archivolt-core
npm install
```

#### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#environment-variables)).

#### 3. Set up MySQL

```bash
mysql -u root -p < schema.sql
```

Or paste `schema.sql` into MySQL Workbench / TablePlus.

#### 4. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Storage** → **New Bucket**
3. Name it exactly: `shards`
4. Set visibility to **Private**
5. Go to **Project Settings** → **API** and copy your **service_role** key

>  Use the `service_role` key, not the `anon` key. The anon key will be rejected by Row Level Security.

#### 5. Set up Cloudinary

1. Create an account at [cloudinary.com](https://cloudinary.com)
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the dashboard
3. Shards are stored automatically under the `archivolt-shards/` folder

#### 6. Start the server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Expected output:

```
 MySQL connected successfully.

🗄  Archivolt Core running → http://localhost:3000
   POST   /upload
   GET    /download/:id
   GET    /health
   GET    /ledger
   DELETE /ledger/:id
```

---

### Frontend Setup

#### 1. Install dependencies

```bash
cd archivolt-ui
npm install
```

Required packages:

```bash
npm install antd @ant-design/icons
```

#### 2. Start the dev server

```bash
npm run dev
```

The UI runs at `http://localhost:5173` and proxies all API calls to `http://localhost:3000` via the Vite config. **The backend must be running** for the dashboard to function.

#### 3. Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static host or point nginx at it.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DB_HOST` | MySQL host (default: `localhost`) |
| `DB_PORT` | MySQL port (default: `3306`) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | MySQL database name (default: `archivolt`) |
| `SUPA_URL` | Supabase project URL (`https://xxx.supabase.co`) |
| `SUPA_KEY` | Supabase **service_role** key (not anon key) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PORT` | Server port (default: `3000`) |

---

## Database Schema

```sql
CREATE TABLE file_ledger (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    filename          VARCHAR(255) NOT NULL,
    mime_type         VARCHAR(100),
    file_size         INT,

    shard_a_provider  VARCHAR(50) NOT NULL DEFAULT 'local',
    shard_a_key       TEXT NOT NULL,        -- local file path

    shard_b_provider  VARCHAR(50) NOT NULL DEFAULT 'supabase',
    shard_b_key       TEXT NOT NULL,        -- Supabase storage path

    shard_c_provider  VARCHAR(50) NOT NULL DEFAULT 'cloudinary',
    shard_c_key       TEXT NOT NULL,        -- Cloudinary public_id

    shard_p_provider  VARCHAR(50) NOT NULL DEFAULT 'local',
    shard_p_key       TEXT NOT NULL,        -- XOR parity file path

    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Each row is a complete map of where all four pieces of a file live. The server reads the provider and key for each shard directly from the ledger — no guessing required.

---

## Storage Drivers

All three drivers implement the same interface:

```js
driver.upload(key, stream)  // → Promise<string>  (stored key/path)
driver.download(key)        // → Readable | Promise<Readable>
driver.ping()               // → Promise<{ ok: boolean, latency: number }>
```

This is the **Strategy Pattern** — the server doesn't know or care which provider it's talking to. Adding a new provider (S3, Backblaze, R2) means creating a new driver file that satisfies these three methods.

### Local Driver (`drivers/local.js`)

- Stores shard files in `/storage` at the project root (auto-created on first upload)
- `upload` pipes the incoming stream directly to `fs.createWriteStream`
- `download` returns `fs.createReadStream`
- `ping` does a real write/delete test on the storage directory

### Supabase Driver (`drivers/supabase.js`)

- Uploads to the `shards` bucket in Supabase Storage
- Collects the stream into a `Buffer` before upload (Supabase JS SDK requirement)
- `download` converts Blob response → Buffer → Node.js Readable stream
- `ping` calls `getBucket('shards')` to verify access

### Cloudinary Driver (`drivers/cloudinary.js`)

- Uses `resource_type: 'raw'` so Cloudinary doesn't attempt media transformation
- Uploads via `upload_stream` to avoid loading large files into memory
- Shards are stored under the `archivolt-shards/` folder
- `download` generates a signed URL and returns an HTTPS stream
- `ping` calls `cloudinary.api.ping()` to verify credentials

---

## Core Logic — storageManager.js

### `createShards(fileStream)`

```js
import { createShards } from './storageManager.js';

const { shardA, shardB, shardC, shardP } = createShards(fileStream);
```

Returns four `PassThrough` streams. As data flows from `fileStream`, bytes are distributed in real-time across all four outputs. Parity is computed in the same single pass — no second read of the file required.

### `reconstruct(streamA, streamB, streamC, streamP, dest)`

```js
import { reconstruct } from './storageManager.js';

await reconstruct(streamA, streamB, streamC, streamP, res);
```

Pass `null` for any shard that failed to download. If exactly one is `null`, the missing shard is recovered via XOR and the correct file is written to `dest`. Returns `{ recovered: boolean, failedShard: string|null }`.

### `bufferToStream(buffer)`

```js
import { bufferToStream } from './storageManager.js';

const stream = bufferToStream(req.file.buffer);
```

Wraps a multer memory buffer into a Node.js `Readable` for consumption by `createShards`.

---

## API Reference

### `POST /upload`

Upload a file to be sharded across all three nodes.

**Request:** `multipart/form-data` — field name `file`, max 50MB.

**Response `201`:**

```json
{
  "status": "success",
  "file": {
    "id": 1,
    "filename": "document.pdf",
    "size": 121952,
    "shards": {
      "a": { "provider": "local",      "key": "1720000000000_a.shard" },
      "b": { "provider": "supabase",   "key": "1720000000000_b.shard" },
      "c": { "provider": "cloudinary", "key": "archivolt-shards/1720000000000_c" },
      "p": { "provider": "local",      "key": "1720000000000_p.shard", "role": "parity" }
    }
  }
}
```

---

### `GET /download/:id`

Reconstruct and download a file by its ledger ID.

**Response:** Binary file stream with `Content-Disposition` and `Content-Type` headers.

**Error `503`** — if 2+ nodes are offline:

```json
{ "error": "Too many nodes offline. Need at least 2 of 3 shards to reconstruct." }
```

If exactly one node is offline, recovery happens silently and the correct file is returned.

---

### `GET /health`

Ping all three storage nodes and return their live status.

**Response `200`:**

```json
{
  "status": "healthy",
  "onlineNodes": 3,
  "totalNodes": 3,
  "nodes": {
    "local":      { "ok": true, "latency": 2   },
    "supabase":   { "ok": true, "latency": 187 },
    "cloudinary": { "ok": true, "latency": 312 }
  },
  "checkedAt": "2025-01-01T12:00:00.000Z"
}
```

Status values: `healthy` (3/3) · `degraded` (2/3) · `critical` (≤1/3)

---

### `GET /ledger`

Paginated list of all sharded files.

**Query params:** `limit` (default 20, max 100) · `offset` (default 0)

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "filename": "document.pdf",
      "mime_type": "application/pdf",
      "file_size": 121952,
      "shard_a_provider": "local",
      "shard_b_provider": "supabase",
      "shard_c_provider": "cloudinary",
      "created_at": "2025-01-01T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

### `DELETE /ledger/:id`

Remove a ledger entry by ID.

>  Removes the database record only. Physical shard files on each provider are **not** deleted.

**Response:**

```json
{ "status": "success", "message": "Ledger entry #1 deleted." }
```

---

## Frontend — Dashboard UI

The frontend is a single-page React app served by Vite. It communicates with the Express backend via a Vite dev proxy (no CORS issues in development) and is structured around four tab-switched pages.

### Design System

| Token | Value |
|---|---|
| Background | `#f5f3ef` (warm parchment) |
| Surface | `#ffffff` / `#f9f7f3` (linen) |
| Ink | `#0f0e11` |
| Accent — Local / Success | `#5a9e1a` lime green |
| Accent — Supabase / Data | `#2d5be3` cobalt blue |
| Accent — Cloudinary / Danger | `#c2410c` coral red |
| Heading font | `Syne 800` — tight tracking, editorial weight |
| Body / data font | `DM Mono` — monospace, used throughout |
| Border radius | 14–16px cards · 8px inputs · 99px pills |

### Key UI Patterns

- **Color carries identity** — lime = local, cobalt = Supabase, coral = Cloudinary, consistently across every page
- **Node cards lift on hover** — `translateY(-3px)` with deepened colored shadow
- **Numbers count up** — stats animate from zero on load using cubic ease-out via `requestAnimationFrame`
- **Latency bars draw in** — left-to-right bar animation on card appear, width proportional to measured latency
- **Ant Design base** — `Table`, `Button`, `Tag`, `Modal`, `Avatar`, `Badge` all overridden via CSS variables to match the warm light theme without hard-coding AntD token names in components

### `src/api.js`

```js
getHealth()                        // GET  /health
uploadFile(file, onProgress)       // POST /upload  — XHR with progress callback
getLedger(limit, offset)           // GET  /ledger
deleteLedgerEntry(id)              // DELETE /ledger/:id
downloadFile(id, filename)         // GET  /download/:id  → triggers browser save
```

### Vite Proxy Config

```js
// vite.config.js
server: {
  proxy: {
    '/upload':   'http://localhost:3000',
    '/download': 'http://localhost:3000',
    '/health':   'http://localhost:3000',
    '/ledger':   'http://localhost:3000',
  }
}
```

---

## Frontend Pages

### Overview (Dashboard)

- **Mesh integrity banner** — full-width strip that changes color based on live node count: lime (3/3 full redundancy) → amber (2/3 degraded) → coral (critical). Includes a visual toggle and live node count.
- **Stat cards** — Total Files (count-up), Data Stored, Recovery Mode with pulsing dot
- **Node cards grid** — 3 columns, one per provider. Each shows node name, shard label, live status pill (Ant `Tag`), large latency number, and a colored progress bar. Cards auto-refresh every 30 seconds.
- **Tech Specs + System Identity** — two-column footer grid with cluster metadata
- **Copyright bar** — with `SecurityScanOutlined`, `ApiOutlined`, `DeploymentUnitOutlined` icons

### Distribute (Upload)

- Drag-and-drop zone — border turns lime on drag-over with outer glow ring
- File selected state compresses the zone and shows filename + size inline
- Transfer progress bar with label that switches from `TRANSFERRING` → `DISTRIBUTING SHARDS`
- Success result shows a lime banner (filename + ID) and a 2×2 grid of shard cards, each tinted with its provider's color and showing the storage key

### Ledger

- Ant `Table` inside a white rounded container
- Columns: `#` · File (name + MIME) · Size · Nodes (3 color-coded chips) · Uploaded · Actions
- Per-provider chip badges: `LOCAL` in lime · `SUPABASE` in cobalt · `CLOUDINARY` in coral
- Download triggers a blob URL save; Delete opens an Ant `Modal.confirm` explaining shards are not removed
- Paginated at 15 rows per page with Ant pagination overridden to match the design system

### Config (Settings)

- Three section cards (MySQL, Supabase, Cloudinary) with tinted headers and colored dot labels
- Underline-style inputs with dark border + ring on focus
- Password fields with inline show/hide toggle
- Amber warning strip explaining the form is reference-only
- Shard architecture 2×2 grid (A, B, C, Parity) with formula annotation
- System info table (API endpoint, max upload, fault tolerance, recovery method)

---

## Fault Tolerance & Parity Recovery

Archivolt implements **single-node fault tolerance** using XOR parity — the same principle behind RAID-5.

### Failure Scenarios

| Situation | Outcome |
|---|---|
| All 3 nodes online | Normal reconstruction |
| 1 node offline | Silent XOR recovery — client receives correct file |
| 2 nodes offline | `503` error — insufficient data to recover |
| 3 nodes offline | `503` error |

### How XOR Recovery Works

```
P = A ^ B ^ C

A = P ^ B ^ C
B = P ^ A ^ C
C = P ^ A ^ B
```

Applied byte-by-byte across aligned positions in the three shards. The parity shard `P` lives on local disk — fastest to access, and if local fails, the two remaining cloud shards plus parity are enough to reconstruct in reverse.

---

## Security Model

### What Each Provider Sees

| Provider | Data Held | Can Read File? |
|---|---|---|
| Local disk | Every 3rd byte (positions 0, 3, 6…) |  No |
| Supabase | Every 3rd byte (positions 1, 4, 7…) |  No |
| Cloudinary | Every 3rd byte (positions 2, 5, 8…) |  No |
| Any 2 providers combined | 2/3 of bytes, non-contiguous |  No |
| All 3 providers combined | All bytes |  Yes (if recombined) |

### Recommendations

- Add `.env` and `storage/` to `.gitignore` — never commit either
- Use the Supabase `service_role` key server-side only — never expose it to the frontend
- Consider encrypting shard bytes before upload for true zero-knowledge storage
- Rotate API keys periodically across all three providers

---

## Testing Guide

### Upload via the Dashboard

1. Start both the backend (`npm run dev` in `archivolt-core`) and frontend (`npm run dev` in `archivolt-ui`)
2. Open `http://localhost:5173` → go to **Distribute**
3. Drop any file and click **Distribute Across 3 Nodes**
4. Verify the shard result cards appear with keys for all 4 shards

### Upload via API (curl / Postman)

```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@/path/to/your/file.pdf"
```

### Download

```bash
# Browser dashboard → Ledger → Download button
# Or direct:
curl http://localhost:3000/download/1 -o recovered.pdf
```

### Check Node Health

```bash
curl http://localhost:3000/health | jq
```

### Simulate a Node Failure

1. Upload a file and note its `id`
2. Delete one `.shard` file from `archivolt-core/storage/`
3. Hit `GET /download/:id` — the file should still return correctly via parity recovery

### Verify Byte Integrity

```bash
# macOS / Linux
md5sum original.pdf
md5sum recovered.pdf
# Hashes must be identical

# Windows (PowerShell)
Get-FileHash original.pdf  -Algorithm MD5
Get-FileHash recovered.pdf -Algorithm MD5
```

---

*Built with Node.js · Express · MySQL · Supabase · Cloudinary · React · Vite · Ant Design*
