import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const webRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = path.join(webRoot, "dist");
const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "mcm-web-build-"),
);

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
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
