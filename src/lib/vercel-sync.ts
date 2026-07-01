// ============================================================
// Best-effort sync of payment env vars to Vercel's Environment
// Variables API, so a value saved in the admin panel also ends
// up in `vercel env ls` / Project Settings → Environment Variables
// — not just in Supabase.
//
// This is intentionally "best effort": if VERCEL_API_TOKEN or
// VERCEL_PROJECT_ID isn't configured yet, callers should treat a
// failed sync as a warning, not a hard error — Supabase remains
// the source of truth the app reads at runtime (see lib/env-vars.ts),
// so payments keep working even if this sync step is skipped.
//
// Setup (do this once, from the Vercel dashboard):
//   1. https://vercel.com/account/tokens → Create Token (scope: the
//      team/project this app is deployed under) → copy the token.
//   2. Project → Settings → General → copy "Project ID".
//   3. Set both as env vars on the Vercel project itself:
//        VERCEL_API_TOKEN=<token>
//        VERCEL_PROJECT_ID=<project id>
//        VERCEL_TEAM_ID=<team id>            (only if the project is under a team, not a personal account)
//      then redeploy once so the running app can read them.
// ============================================================

const VERCEL_API_BASE = 'https://api.vercel.com'

export interface VercelSyncResult {
  ok: boolean
  error?: string
}

function getVercelConfig() {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID // optional
  return { token, projectId, teamId }
}

export function isVercelSyncConfigured(): boolean {
  const { token, projectId } = getVercelConfig()
  return !!token && !!projectId
}

interface VercelEnvListItem {
  id: string
  key: string
  target: string[]
}

async function findExistingEnvId(key: string): Promise<string | null> {
  const { token, projectId, teamId } = getVercelConfig()
  const url = new URL(`${VERCEL_API_BASE}/v9/projects/${projectId}/env`)
  if (teamId) url.searchParams.set('teamId', teamId)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) return null

  const json = (await res.json()) as { envs?: VercelEnvListItem[] }
  const match = json.envs?.find((e) => e.key === key)
  return match?.id ?? null
}

/**
 * Creates or updates a single environment variable on Vercel, applied to
 * Production + Preview + Development so it behaves the same as a value set
 * by hand in the dashboard. Returns { ok: false, error } instead of
 * throwing — callers decide how loudly to surface a sync failure.
 *
 * Note: Vercel does NOT hot-reload env vars into the currently running
 * serverless instance — a new deployment (or at minimum a redeploy) is
 * needed for `process.env.X` to reflect this on Vercel's side. The app's
 * own runtime reads from Supabase (lib/env-vars.ts) precisely so it does
 * NOT have to wait for that redeploy.
 */
export async function syncEnvVarToVercel(key: string, value: string): Promise<VercelSyncResult> {
  const { token, projectId, teamId } = getVercelConfig()
  if (!token || !projectId) {
    return { ok: false, error: 'VERCEL_API_TOKEN / VERCEL_PROJECT_ID belum dikonfigurasi — sinkronisasi ke Vercel dilewati.' }
  }

  try {
    const existingId = await findExistingEnvId(key)
    const teamQuery = teamId ? `?teamId=${teamId}` : ''

    if (existingId) {
      const res = await fetch(`${VERCEL_API_BASE}/v9/projects/${projectId}/env/${existingId}${teamQuery}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value, target: ['production', 'preview', 'development'] }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        const text = await res.text()
        return { ok: false, error: `Vercel API error ${res.status}: ${text.slice(0, 200)}` }
      }
      return { ok: true }
    }

    const res = await fetch(`${VERCEL_API_BASE}/v10/projects/${projectId}/env${teamQuery}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Vercel API error ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: `Gagal menghubungi Vercel API: ${message}` }
  }
}
