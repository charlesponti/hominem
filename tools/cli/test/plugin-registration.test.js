import assert from "assert";
import fs from "fs";
import path from "path";

const cliPkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json")));

// Check binary-first distribution settings
assert(
  cliPkg.bin && cliPkg.bin.hominem === "./dist/hominem",
  "@hominem/cli should expose compiled hominem binary"
);

assert(
  cliPkg.scripts && typeof cliPkg.scripts["build:core"] === "string",
  "@hominem/cli should define build:core for compiled binary output"
);

const registryPath = path.resolve(process.cwd(), "src/v2/registry.ts");
const registryContent = fs.readFileSync(registryPath, "utf-8");
const expectedDomains = ["auth", "ai", "data", "files", "agent", "system", "config"];
for (const domain of expectedDomains) {
  assert(
    registryContent.includes(`id: '${domain}'`),
    `registry should declare top-level domain route: ${domain}`
  );
}

console.log("✅ Runtime registration test passed - v2 command graph configured");
console.log(`   Domains configured: ${expectedDomains.join(", ")}`);
