import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const sqlite = new Database(path.join(DATA_DIR, "chat2cash.db"));

export const auth = betterAuth({
  database: {
    db: sqlite,
    type: "sqlite",
  },
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
