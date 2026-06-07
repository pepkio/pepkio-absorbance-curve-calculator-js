/** Integration tests against live Pepkio Tools API. */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";

import { PepkioClient } from "../src/client.js";
import { PepkioAPIError } from "../src/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const monorepoEnv = resolve(__dirname, "../../../.env");
if (existsSync(monorepoEnv)) {
  loadEnv({ path: monorepoEnv });
}

const packageEnv = resolve(__dirname, "../.env");
if (existsSync(packageEnv)) {
  loadEnv({ path: packageEnv });
}

const ENVIRONMENTS = [
  { name: "local", baseUrl: "https://tools.localtest.me" },
  { name: "production", baseUrl: "https://tools.pepkio.com" },
] as const;

const EXPECTED_EXAMPLES = [
  "bca_linear",
  "blocking_few_standards",
  "sandwich_elisa_4pl",
  "competitive_elisa_4pl",
] as const;

function resolveEnvironments(): Array<{ name: string; baseUrl: string }> {
  const override = process.env.PEPKIO_API_BASE_URL;
  if (override) {
    const name = override.includes("localtest.me") ? "local" : "production";
    return [{ name, baseUrl: override.replace(/\/$/, "") }];
  }
  return [...ENVIRONMENTS];
}

function apiKeyFor(baseUrl: string): string | undefined {
  if (baseUrl.includes("localtest.me")) {
    return process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY;
  }
  return process.env.PEPKIO_API_KEY;
}

describe.each(resolveEnvironments())("$name integration", (env) => {
  let client: PepkioClient | null = null;
  let skipReason: string | null = null;

  beforeAll(async () => {
    const apiKey = apiKeyFor(env.baseUrl);
    if (!apiKey) {
      skipReason = `No API key for ${env.name} (set LOCAL_PEPKIO_API_KEY or PEPKIO_API_KEY)`;
      return;
    }
    const candidate = new PepkioClient({ apiKey, baseUrl: env.baseUrl });
    try {
      await candidate.getManifest({ refresh: true });
      client = candidate;
    } catch (err) {
      if (
        err instanceof PepkioAPIError &&
        err.statusCode === 404 &&
        err.code === "TOOL_NOT_FOUND"
      ) {
        skipReason = `Tool not deployed on ${env.name} (${env.baseUrl})`;
        return;
      }
      throw err;
    }
  });

  function liveIt(name: string, fn: (c: PepkioClient) => Promise<void>) {
    it(name, async () => {
      if (skipReason || !client) {
        return;
      }
      await fn(client);
    });
  }

  liveIt("fetches manifest", async (c) => {
    const manifest = await c.getManifest({ refresh: true });
    expect(manifest.tool_id).toBe("absorbance-curve-calculator");
    const names = await c.listExamples();
    for (const expected of EXPECTED_EXAMPLES) {
      expect(names).toContain(expected);
    }
  });

  liveIt("runs bca_linear example", async (c) => {
    const input = await c.getExampleInput("bca_linear");
    const result = await c.run(input);
    expect(result.status).toBe("completed");
    expect(result.run_id).toBeTruthy();
    expect(result.permalink).toBeTruthy();
    expect(result.result).toBeTruthy();
    expect(result.result?.has_blocking_errors).toBe(false);
    const samples = result.result?.samples;
    expect(Array.isArray(samples)).toBe(true);
    expect((samples as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect(result.result?.selected_model).toBeTruthy();
  });

  liveIt("runs sandwich_elisa_4pl example", async (c) => {
    const input = await c.getExampleInput("sandwich_elisa_4pl");
    const result = await c.run(input);
    expect(result.status).toBe("completed");
    expect(result.result).toBeTruthy();
    expect(result.result?.has_blocking_errors).toBe(false);
    expect(result.result?.selected_model).toBe("four_pl");
    const modelComparison = result.result?.model_comparison as Record<string, unknown> | undefined;
    expect(modelComparison).toBeTruthy();
    const fourPl = modelComparison?.four_pl as Record<string, unknown> | undefined;
    expect(fourPl).toBeTruthy();
    expect(Number(fourPl?.r_squared ?? 0)).toBeGreaterThan(0.99);
  });

  liveIt("runs competitive_elisa_4pl example", async (c) => {
    const input = await c.getExampleInput("competitive_elisa_4pl");
    const result = await c.run(input);
    expect(result.status).toBe("completed");
    expect(result.result).toBeTruthy();
    expect(result.result?.has_blocking_errors).toBe(false);
    expect(result.result?.selected_model).toBe("four_pl_inverted");
  });

  liveIt("runs blocking_few_standards example", async (c) => {
    const input = await c.getExampleInput("blocking_few_standards");
    const result = await c.run(input);
    expect(result.status).toBe("completed");
    expect(result.result).toBeTruthy();
    expect(result.result?.has_blocking_errors).toBe(true);
  });
});
