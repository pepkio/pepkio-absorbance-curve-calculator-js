/** Typed API request/response models (from manifest input/output schemas). */

import { z } from "zod";

import { PepkioAPIError } from "./errors.js";

export const AbsorbanceCurveToolInputSchema = z
  .object({
    assay_type: z.string(),
    concentration_unit: z.string(),
    wells: z.array(z.record(z.unknown())),
    layout: z.array(z.record(z.unknown())),
    standards: z.array(z.record(z.unknown())),
    dilution_factors: z.record(z.number()).optional(),
    excluded_wells: z.array(z.string()).optional(),
    model_override: z.string().optional(),
  })
  .passthrough();

export type AbsorbanceCurveToolInput = z.infer<typeof AbsorbanceCurveToolInputSchema>;

export const AbsorbanceCurveToolOutputSchema = z
  .object({
    has_blocking_errors: z.boolean().optional(),
    errors: z.array(z.unknown()).optional(),
    warnings: z.array(z.unknown()).optional(),
    samples: z.array(z.unknown()).optional(),
    model_comparison: z.record(z.unknown()).optional(),
    selected_model: z.string().optional(),
    recommended_model: z.string().optional(),
    audit_log: z.array(z.unknown()).optional(),
    qc_summary: z.record(z.unknown()).optional(),
    blank_mean: z.number().optional(),
  })
  .passthrough();

export type AbsorbanceCurveToolOutput = z.infer<typeof AbsorbanceCurveToolOutputSchema>;

export const RunResultSchema = z
  .object({
    run_id: z.string(),
    status: z.string(),
    result: z.record(z.unknown()).nullable().optional(),
    error: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
        details: z.record(z.unknown()).optional(),
      })
      .nullable()
      .optional(),
    result_url: z.string().nullable().optional(),
    permalink: z.string().nullable().optional(),
    duration_ms: z.number().nullable().optional(),
  })
  .passthrough();

export type RunResult = z.infer<typeof RunResultSchema>;

export function parseRunResponse(data: Record<string, unknown>): RunResult {
  return RunResultSchema.parse(data);
}

export function raiseForError(result: RunResult): void {
  if (!result.error) {
    return;
  }
  const err = result.error;
  throw new PepkioAPIError(err.message ?? "Tool run failed", {
    code: err.code,
    responseBody: {
      run_id: result.run_id,
      status: result.status,
      error: result.error,
    },
  });
}
