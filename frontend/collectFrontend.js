/**
 * collectFrontend.js
 * Run from the React project root:  node collectFrontend.js
 * Output:  code.txt
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ------------------------------------------------------------------
 * ESM __dirname replacement
 * ------------------------------------------------------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------------------------------------------------------------
 * Config
 * ------------------------------------------------------------------ */
const ROOT = __dirname;
const OUTPUT_FILE = "code.txt";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".github",
  ".vscode",
  ".idea",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".vercel",
  ".netlify",
  "public",
]);

const IGNORE_FILES = new Set([
  OUTPUT_FILE,
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".DS_Store",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  "collectFrontend.js",
]);

const INCLUDE_EXT = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".json",
  ".md",
  ".txt",
  ".svg",
  ".yml",
  ".yaml",
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
const isIgnoredDir = (name) => IGNORE_DIRS.has(name);
const isIgnoredFile = (name) => IGNORE_FILES.has(name);
const isIncludedExt = (name) => INCLUDE_EXT.has(path.extname(name).toLowerCase());

const relPath = (absPath) => path.relative(ROOT, absPath).split(path.sep).join("/");

function collectFiles(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (isIgnoredDir(entry.name)) continue;
      collectFiles(abs, acc);
      continue;
    }

    if (!entry.isFile()) continue;
    if (isIgnoredFile(entry.name)) continue;
    if (!isIncludedExt(entry.name)) continue;

    try {
      const { size } = fs.statSync(abs);
      if (size > MAX_FILE_SIZE) continue;
    } catch {
      continue;
    }

    acc.push(abs);
  }

  return acc.sort((a, b) => a.localeCompare(b));
}

function buildTree(files) {
  const root = {};
  for (const file of files) {
    const parts = file.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        node[part] = node[part] || { __file: true };
      } else {
        node[part] = node[part] || {};
        node = node[part];
      }
    }
  }

  const lines = [];
  const walk = (node, prefix = "") => {
    const keys = Object.keys(node).sort((a, b) => {
      const aDir = !node[a].__file;
      const bDir = !node[b].__file;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.localeCompare(b);
    });

    keys.forEach((key, idx) => {
      const isLast = idx === keys.length - 1;
      const branch = isLast ? "└── " : "├── ";
      const isFile = !!node[key].__file;
      lines.push(`${prefix}${branch}${key}${isFile ? "" : "/"}`);
      if (!isFile) {
        walk(node[key], prefix + (isLast ? "    " : "│   "));
      }
    });
  };

  walk(root);
  return lines.join("\n");
}

/* ------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------ */
function main() {
  console.log(`📁 Scanning: ${ROOT}`);

  const files = collectFiles(ROOT);
  console.log(`✅ Found ${files.length} files to bundle`);

  const relFiles = files.map(relPath);

  const parts = [];

  parts.push("=".repeat(80));
  parts.push("FRONTEND CODE BUNDLE (React)");
  parts.push(`Generated: ${new Date().toISOString()}`);
  parts.push(`Root: ${ROOT}`);
  parts.push(`Total files: ${files.length}`);
  parts.push("=".repeat(80));
  parts.push("");

  parts.push("PROJECT STRUCTURE");
  parts.push("-".repeat(80));
  parts.push(buildTree(relFiles));
  parts.push("");

  parts.push("=".repeat(80));
  parts.push("FILE CONTENTS");
  parts.push("=".repeat(80));
  parts.push("");

  for (const abs of files) {
    const rel = relPath(abs);
    let content = "";

    try {
      content = fs.readFileSync(abs, "utf8");
    } catch (err) {
      content = `/* Unable to read file: ${err.message} */`;
    }

    parts.push("─".repeat(80));
    parts.push(`FILE: ${rel}`);
    parts.push("─".repeat(80));
    parts.push(content.trimEnd());
    parts.push("");
  }

  fs.writeFileSync(path.join(ROOT, OUTPUT_FILE), parts.join("\n"), "utf8");

  const stats = fs.statSync(path.join(ROOT, OUTPUT_FILE));
  const kb = (stats.size / 1024).toFixed(2);
  console.log(`📝 Wrote ${OUTPUT_FILE} (${kb} KB)`);
}

main();