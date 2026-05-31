const fs = require("fs");
const path = require("path");
const results = [];

function walk(dir, depth) {
  if (depth > 8) return;
  if (!fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if ([".cache", ".git", "__tests__", "test", "tests"].includes(e.name))
      continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, depth + 1);
    } else if (e.name.endsWith(".js") && !e.name.endsWith(".min.js")) {
      let content;
      try {
        content = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (const line of lines) {
        if (/^\s+#[a-zA-Z_]/.test(line) || /this\.#[a-zA-Z_]/.test(line)) {
          const rel = full.split("node_modules" + path.sep).slice(1).join("node_modules" + path.sep);
          results.push(rel);
          break;
        }
      }
    }
  }
}

walk(path.join(__dirname, "..", "node_modules"), 0);
console.log("Files with private fields:");
results.forEach((r) => console.log(" -", r));
console.log("Total:", results.length);
