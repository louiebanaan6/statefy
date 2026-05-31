// Patches ALL copies of @radix-ui/react-collection (including nested)
// Replaces private class fields (#keys) with WeakMap - compatible with Hermes in Expo Go.
const fs = require("fs");
const path = require("path");

function patchFile(target) {
  let content = fs.readFileSync(target, "utf8");

  if (!content.includes("#keys")) {
    console.log("patch-radix: already patched:", target);
    return;
  }

  content = content
    .replace(
      "// src/ordered-dictionary.ts\n",
      "// src/ordered-dictionary.ts\nvar _keysMap = new WeakMap();\n"
    )
    .replace(/\s*#keys;\n/, "\n")
    .replace(
      /this\.#keys = \[\.\.\.super\.keys\(\)\];/,
      "_keysMap.set(this, [...super.keys()]);"
    )
    .replace(/this\.#keys = \[\];/g, "_keysMap.set(this, []);")
    .replace(/this\.#keys/g, "_keysMap.get(this)");

  fs.writeFileSync(target, content, "utf8");
  console.log("patch-radix: patched:", target);
}

function findAll(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".cache" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findAll(full, results);
      } else if (
        entry.name === "index.js" &&
        full.includes("react-collection") &&
        full.includes("dist")
      ) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

const nm = path.join(__dirname, "../node_modules");
const targets = findAll(nm);

console.log("patch-radix: found", targets.length, "target(s)");
targets.forEach(patchFile);
