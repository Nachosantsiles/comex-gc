import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// DATABASE_PATH env var allows Railway Volume or any custom path
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'comex.db')
const DB_DIR = path.dirname(DB_PATH)

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 10000') // wait up to 10s instead of immediately throwing SQLITE_BUSY
db.pragma('foreign_keys = ON')

export default db
