import { chmod, cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const webRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = path.join(webRoot, "dist");
const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "mcm-web-build-"),
);

async function normalizeStaticAssetPermissions(directory) {
  await chmod(directory, 0o755);

  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await normalizeStaticAssetPermissions(entryPath);
      } else if (entry.isFile()) {
        await chmod(entryPath, 0o644);
      }
    }),
  );
}

try {
  await build({
    root: webRoot,
    configFile: path.join(webRoot, "vite.config.ts"),
    build: {
      emptyOutDir: true,
      outDir: temporaryDirectory,
    },
  });

  await rm(outputDirectory, { force: true, recursive: true });
  await cp(temporaryDirectory, outputDirectory, { recursive: true });
  await normalizeStaticAssetPermissions(outputDirectory);
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
