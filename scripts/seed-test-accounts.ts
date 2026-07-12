import { auth, getUserByEmail, updateStaffRole } from "../lib/auth";

const password = process.env.TEST_ACCOUNT_PASSWORD;
if (!password || password.length < 8) {
  throw new Error("Set TEST_ACCOUNT_PASSWORD to a password of at least 8 characters.");
}

const accounts = [
  { name: "Testin Contributor", email: process.env.TEST_CONTRIBUTOR_EMAIL || "testin@chat2cash.local", role: "contributor" },
  { name: "Testin Admin", email: process.env.TEST_ADMIN_EMAIL || "testin-admin@chat2cash.local", role: "admin" },
] as const;

for (const account of accounts) {
  let user = getUserByEmail(account.email);
  if (!user) {
    await auth.api.signUpEmail({
      body: { name: account.name, email: account.email, password },
      headers: new Headers(),
    });
    user = getUserByEmail(account.email);
  }
  if (!user) throw new Error(`Could not create ${account.email}.`);
  if (account.role === "admin" && user.role !== "admin") updateStaffRole(user.id, "admin");
  console.log(`Ready: ${account.email} (${account.role})`);
}
