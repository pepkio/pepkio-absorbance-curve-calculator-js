# Pepkio Standard Curve & Concentration Calculator

Node.js ESM library and CLI that submit 96-well plate absorbance data to the Pepkio Standard Curve & Concentration Calculator API and return dilution-corrected concentrations with QC flags.

# What It Does

Plate-reader exports for BCA, Bradford, or ELISA assays need blank subtraction, curve model selection, interpolation, and dilution correction before concentrations can be reported. Rebuilding that workflow in a spreadsheet for each plate is slow and error-prone.

This package calls the hosted Pepkio Standard Curve & Concentration Calculator over REST from Node.js (≥18), bundlers, or CI. Submit 96-well absorbance values, well layout, standard concentrations, and dilution factors; receive fitted model parameters, side-by-side R² comparisons, per-sample concentrations with formula paths, and QC flags for high replicate CV or out-of-range ODs.

Programmatic runs require a network connection and a Pepkio API key. Calculations are not bundled for offline use.

# Features

- Assay types: BCA, Bradford, sandwich ELISA, competitive ELISA
- Blank subtraction and assay-aware default models (linear for protein assays, 4PL for ELISA)
- Model comparison: linear, quadratic, 4PL, inverted 4PL with R²
- Optional `model_override` and `excluded_wells`
- Dilution correction with formula path in output
- QC flags: replicate CV > 20%, out-of-range ODs, R² thresholds
- Manifest examples: `bca_linear`, `sandwich_elisa_4pl`, `competitive_elisa_4pl`, `blocking_few_standards`
- Manifest helpers: `getManifest`, `listExamples`, `getExampleInput`
- `run`, `getRun`, and `waitForRun` for sync execution
- CLI: `pepkio-absorbance-curve-calculator manifest` and `run`
- Configurable via `PEPKIO_API_KEY` and `PEPKIO_API_BASE_URL`

# Installation

```bash
npm install pepkio-absorbance-curve-calculator
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before calling `run()`:

```bash
export PEPKIO_API_KEY="your-key"
```

Create a key at [Pepkio API keys](https://www.pepkio.com/account/api-keys).

Optional overrides:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (required for `run`) |
| `LOCAL_PEPKIO_API_KEY` | Local dev key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API host (default `https://tools.pepkio.com`) |

# Quick Example

```typescript
import { PepkioClient } from "pepkio-absorbance-curve-calculator";

const client = new PepkioClient({ apiKey: process.env.PEPKIO_API_KEY });

const input = await client.getExampleInput("bca_linear");
const result = await client.run(input);

for (const sample of (result.result?.samples ?? []) as Array<Record<string, unknown>>) {
  console.log(sample.sample_id, sample.corrected_conc, sample.formula_path);
}
```

Manifest inspection does not require an API key.

# CLI

```bash
npx pepkio-absorbance-curve-calculator manifest --examples
npx pepkio-absorbance-curve-calculator run --example bca_linear
```

Pass `--base-url` and `--api-key` to override environment defaults.

# Typical Use Cases

- BCA protein assay standard curve from 96-well absorbance data (`bca_linear`)
- ELISA sample concentration back-calculation with dilution factors (`sandwich_elisa_4pl`, `competitive_elisa_4pl`)
- Comparing linear vs 4PL fit for Bradford or ELISA data
- Automated reanalysis of plate-reader exports in scripts or CI
- QC screening for R², replicate CV, and out-of-range samples before reporting
- Validating insufficient standard levels (`blocking_few_standards`)

# Scientific Background

Blank wells are averaged and subtracted before fitting. BCA and Bradford default to linear regression; ELISA defaults to 4PL (sandwich) or inverted 4PL (competitive). Corrected concentration = interpolated concentration × dilution factor. The engine flags R² below 0.98 (linear) or 0.995 (4PL), replicate CV above 20%, and ODs outside the standard range.

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/absorbance-curve-calculator

The web interface adds paste-from-Excel grid entry, one-click well exclusion with audit logging, CSV/PDF export with curve plots, and reload of recent runs.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-absorbance-curve-calculator-js

Web Application: https://www.pepkio.com/tools/absorbance-curve-calculator

Python client (PyPI): https://pypi.org/project/pepkio-absorbance-curve-calculator/

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services.

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/112da55cc2b3ff98410dceb3d4a606adf9ebea01177760938e95f2a05ecc7afb)
