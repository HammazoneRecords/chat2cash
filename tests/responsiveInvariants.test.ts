import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const app = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
const admin = fs.readFileSync(path.join(root, "src", "components", "AdminDashboard.tsx"), "utf8");
const processor = fs.readFileSync(path.join(root, "src", "components", "FileProcessor.tsx"), "utf8");

test("mobile navigation keeps auth actions visible and tabs scrollable", () => {
  assert.match(app, /flex flex-wrap items-center justify-between/);
  assert.match(app, /overflow-x-auto/);
  assert.match(app, /<span>Sign In<\/span>/);
  assert.match(app, /whitespace-nowrap/);
});

test("admin summary layout uses responsive minimum columns", () => {
  assert.match(admin, /repeat\(auto-fit,minmax\(140px,1fr\)/);
});

test("contributor review exposes all export and submission actions", () => {
  assert.match(processor, /accept="\.txt,\.zip,\.json"/);
  assert.match(processor, /id="btn-download-json"/);
  assert.match(processor, /id="btn-download-csv"/);
  assert.match(processor, /id="btn-submit-reviewed-json"/);
});
