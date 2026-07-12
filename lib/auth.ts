import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const sqlite = new Database(path.join(DATA_DIR, "chat2cash.db"));

// Ensure Better Auth tables exist (auto-migration not triggering via Kysely wrapper)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    role TEXT DEFAULT 'contributor'
  );
  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY NOT NULL,
    expiresAt TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id)
  );
  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY NOT NULL,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id),
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TEXT,
    refreshTokenExpiresAt TEXT,
    scope TEXT,
    password TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY NOT NULL,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS staff_invites (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
console.log("[Auth] Better Auth tables ensured.");
try { sqlite.exec("ALTER TABLE user ADD COLUMN disabledAt TEXT"); } catch {}

export const auth = betterAuth({
  database: sqlite,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "contributor",
        input: false, // only set server-side
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // After Better Auth creates a user, create the matching profile row
        after: async (newUser) => {
          const { database } = await import("../db");
          const cleanPhone = (newUser as any).phone?.replace(/\D/g, "") || "";
          const country = (newUser as any).country || "JM";
          const numericSuffix = cleanPhone.slice(-6) || Math.floor(100000 + Math.random() * 900000).toString();
          const userId = newUser.id; // Use Better Auth's user.id as our userId

          try {
            // Create skeleton profile — contributor fills in the rest via /api/profile/update
            database.createProfile({
              userId,
              fullName: newUser.name,
              email: newUser.email,
              phone: "",
              wipayAccount: "",
              wipayLink: "",
              country: "JM",
              town: "",
              age: null,
              gender: "",
              educationLevel: null,
              school: null,
              singleParentHome: false,
              demographicOptIn: false,
              idPhoto: "",
            });
          } catch (err: any) {
            if (!err.message?.includes("UNIQUE constraint")) {
              console.error("[auth hook] Failed to create profile:", err);
            }
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

const staffRoles = new Set(["moderator", "admin"]);

export function listStaffUsers() {
  return sqlite.prepare("SELECT id, name, email, role, createdAt, updatedAt FROM user WHERE role IN ('moderator', 'admin', 'owner') ORDER BY createdAt DESC").all();
}

export function getUserByEmail(email: string) {
  return sqlite.prepare("SELECT id, name, email, role, disabledAt FROM user WHERE email = ?").get(email.trim().toLowerCase()) as any;
}

export function updateStaffRole(userId: string, role: string) {
  if (!staffRoles.has(role) && role !== "owner") throw new Error("Invalid staff role.");
  const user = sqlite.prepare("SELECT id, role FROM user WHERE id = ?").get(userId) as any;
  if (!user) throw new Error("Staff user not found.");
  if (user.role === "owner") throw new Error("Owner role cannot be changed.");
  sqlite.prepare("UPDATE user SET role = ?, updatedAt = datetime('now') WHERE id = ?").run(role, userId);
}

export function isUserDisabled(userId: string): boolean {
  const row = sqlite.prepare("SELECT disabledAt FROM user WHERE id = ?").get(userId) as any;
  return !!row?.disabledAt;
}

export function setStaffDisabled(userId: string, disabled: boolean) {
  const user = sqlite.prepare("SELECT role FROM user WHERE id = ?").get(userId) as any;
  if (!user) throw new Error("Staff user not found.");
  if (user.role === "owner") throw new Error("Owner cannot be disabled.");
  sqlite.prepare("UPDATE user SET disabledAt = ?, updatedAt = datetime('now') WHERE id = ?").run(disabled ? new Date().toISOString() : null, userId);
}

export function createStaffInvite(email: string, role: string, createdBy: string) {
  if (!staffRoles.has(role)) throw new Error("Staff invites may only create moderator or admin accounts.");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const id = crypto.randomUUID();
  sqlite.prepare("INSERT INTO staff_invites (id, email, role, tokenHash, expiresAt, createdBy) VALUES (?, ?, ?, ?, datetime('now', '+24 hours'), ?)").run(id, email.trim().toLowerCase(), role, tokenHash, createdBy);
  return { id, email: email.trim().toLowerCase(), role, token, expiresInHours: 24 };
}

export function consumeStaffInvite(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invite = sqlite.prepare("SELECT * FROM staff_invites WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > datetime('now')").get(tokenHash) as any;
  if (!invite) throw new Error("Invite is invalid or expired.");
  sqlite.prepare("UPDATE staff_invites SET usedAt = datetime('now') WHERE id = ?").run(invite.id);
  return invite;
}

export function revokeUserSessions(userId: string) {
  return sqlite.prepare("DELETE FROM session WHERE userId = ?").run(userId).changes;
}
