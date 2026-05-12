export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, any> = {}
  let allOk = true

  // ── 1. Environment variables ─────────────────────────────────────────────
  const authSecret = process.env.AUTH_SECRET
  const nextauthSecret = process.env.NEXTAUTH_SECRET
  const authUrl = process.env.AUTH_URL
  checks.env = {
    AUTH_SECRET: authSecret ? `set (${authSecret.length} chars)` : 'MISSING ❌',
    AUTH_URL: authUrl ? authUrl : 'MISSING ❌ (required for login CSRF)',
    NEXTAUTH_SECRET: nextauthSecret ? 'set (legacy, ignored in v5)' : 'not set',
    DATABASE_PATH: process.env.DATABASE_PATH ?? 'default (cwd/data/comex.db)',
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  }
  if (!authUrl) allOk = false
  if (!authSecret) allOk = false

  // ── 2. Database connectivity ─────────────────────────────────────────────
  try {
    const db = (await import('@/lib/db')).default
    const { initializeDatabase } = await import('@/lib/schema')
    initializeDatabase()

    const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n
    const admin = db.prepare(
      "SELECT id, email, role, active, perm_version FROM users WHERE email='admin@cazorla.com'"
    ).get() as any

    // Check user_permissions table exists
    const hasPT = (db.prepare(
      "SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='user_permissions'"
    ).get() as any).n

    // Check users table schema
    const userTableSql = (db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    ).get() as any)?.sql

    checks.database = {
      ok: true,
      userCount,
      admin: admin
        ? { id: admin.id, email: admin.email, role: admin.role, active: admin.active, perm_version: admin.perm_version }
        : null,
      user_permissions_table: hasPT === 1 ? 'exists ✅' : 'MISSING ❌',
      users_schema_has_perm_version: userTableSql?.includes('perm_version') ? 'yes ✅' : 'no ❌',
      users_schema_has_old_check: userTableSql?.includes("CHECK(role IN ('admin','editor','viewer'))") ? 'yes (needs migration)' : 'no ✅',
    }
    if (!admin) allOk = false
  } catch (err: any) {
    checks.database = { ok: false, error: err?.message }
    allOk = false
  }

  // ── 3. Auth configuration ────────────────────────────────────────────────
  try {
    const { authConfig } = await import('@/lib/auth.config')
    checks.auth = {
      strategy: (authConfig.session as any)?.strategy ?? 'unknown',
      trustHost: (authConfig as any).trustHost,
      pages: authConfig.pages,
    }
  } catch (err: any) {
    checks.auth = { ok: false, error: err?.message }
    allOk = false
  }

  // ── 4. Permissions module ────────────────────────────────────────────────
  try {
    const { ROLE_PERMISSIONS } = await import('@/lib/permissions')
    checks.permissions = {
      roles: Object.keys(ROLE_PERMISSIONS),
      adminPermCount: ROLE_PERMISSIONS.admin?.length ?? 0,
    }
  } catch (err: any) {
    checks.permissions = { ok: false, error: err?.message }
    allOk = false
  }

  return NextResponse.json(
    { ok: allOk, timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503 }
  )
}
