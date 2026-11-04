import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
const work = mkdtempSync(resolve(tmpdir(), "fingerly-node-package-"));
try {
  execFileSync("pnpm", ["build"], { stdio: "inherit" });
  execFileSync("pnpm", ["pack", "--pack-destination", work], {
    stdio: "inherit",
  });
  const packed = readdirSync(work).find((name) => name.endsWith(".tgz"));
  if (!packed) throw new Error("Package artifact was not created");
  writeFileSync(
    resolve(work, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--offline",
      "--no-audit",
      "--no-fund",
      resolve(work, packed),
    ],
    { cwd: work, stdio: "inherit" },
  );
  const assertions = `if (typeof sdk.Fingerly !== 'function' || typeof sdk.Fingerly.verifyWebhook !== 'function' || typeof sdk.Fingerly.createProxy !== 'function') throw new Error('Missing class API'); if (typeof sdk.load !== 'function' || typeof sdk.createProxy !== 'function' || typeof sdk.verifyWebhook !== 'function' || typeof sdk.FingerlyTimeoutError !== 'function') throw new Error('Missing exports'); const c = new sdk.Fingerly({secretKey:'fly_sk_development_smoke'}); if(typeof c.events.get !== 'function' || typeof c.events.list !== 'function') throw new Error('Missing event reads');`;
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import * as sdk from '@fingerly/node'; ${assertions}`,
    ],
    { cwd: work, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [
      "--input-type=commonjs",
      "-e",
      `const sdk = require('@fingerly/node'); ${assertions}`,
    ],
    { cwd: work, stdio: "inherit" },
  );
  // The two builds are separate copies; errors must still match across them.
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { createRequire } from 'node:module'; import * as esm from '@fingerly/node'; const cjs = createRequire(process.cwd() + '/')('@fingerly/node'); if (cjs.FingerlyAPIError === esm.FingerlyAPIError) throw new Error('Expected two copies'); if (!(new cjs.FingerlyAPIError('x', 404) instanceof esm.FingerlyAPIError) || !(new esm.FingerlyTimeoutError() instanceof cjs.FingerlyConnectionError)) throw new Error('Errors do not match across ESM and CommonJS');`,
    ],
    { cwd: work, stdio: "inherit" },
  );
  // Types must resolve for both module systems under every resolution mode a
  // customer may use; a CommonJS project once got the ESM declarations.
  const tsc = resolve("node_modules/typescript/bin/tsc");
  const usage = `import { Fingerly, createProxy, FingerlyAPIError } from "@fingerly/node";
import type { Event } from "@fingerly/node";
export const client: Fingerly = new Fingerly({ secretKey: "fly_sk_development_x" });
export const handler: (request: Request) => Promise<Response> = createProxy({
  proxyKey: "fly_px_development_x",
  clientIp: () => "203.0.113.1",
});
export const isError = (e: unknown): boolean => e instanceof FingerlyAPIError;
export type Read = Event;
`;
  for (const [type, module, moduleResolution] of [
    ["commonjs", "node16", "node16"],
    ["commonjs", "nodenext", "nodenext"],
    ["module", "node16", "node16"],
    ["module", "nodenext", "nodenext"],
    ["module", "esnext", "bundler"],
    ["commonjs", "commonjs", "node10"],
  ]) {
    const dir = resolve(work, `types-${type}-${moduleResolution}`);
    mkdirSync(dir);
    writeFileSync(resolve(dir, "package.json"), JSON.stringify({ type }));
    writeFileSync(resolve(dir, "use.ts"), usage);
    writeFileSync(
      resolve(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module,
          moduleResolution,
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          types: [],
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        files: ["use.ts"],
      }),
    );
    execFileSync(process.execPath, [tsc, "-p", dir], { stdio: "inherit" });
  }
  const pkg = JSON.parse(
    readFileSync(resolve(work, "node_modules/@fingerly/node/package.json")),
  );
  if (
    pkg.version !== "0.1.0" ||
    (pkg.dependencies && Object.keys(pkg.dependencies).length)
  )
    throw new Error("Unexpected package version or runtime dependencies");
  console.log(
    "Packed package installs, imports and type-checks as ESM and CommonJS.",
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
