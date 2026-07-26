import "server-only";

import {
  FOOT_ANALYSIS_SYSTEM_PROMPT,
  buildPatientContext,
} from "@/lib/foot-analysis-prompt";
import { PHOTO_SCREENING_JSON_SCHEMA } from "@/lib/photoScreening";
import type { PhotoScreeningResult } from "@/lib/types";
import type {
  AnalysisProvider,
  AnalysisProviderInput,
  AnalysisProviderResult,
} from "./analysis";

const PROMPT_VERSION = "foot-analysis-v1";
const SCHEMA_VERSION = "photo-screening-v1";
const SAFETY_RULES_VERSION = "screening-safety-v1";

/**
 * Same model call as /api/foot-analysis, packaged as the queue-worker
 * provider. Returns null when the server has no Anthropic credentials so
 * callers can leave the outbox event for a managed queue instead.
 */
export function anthropicAnalysisProvider(): AnalysisProvider | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = process.env.ANTHROPIC_VISION_MODEL ?? "claude-sonnet-4-6";

  return {
    async analyze(
      input: AnalysisProviderInput
    ): Promise<AnalysisProviderResult> {
      const context = input.context as Record<string, unknown> | undefined;
      const content: unknown[] = [
        {
          type: "text",
          text:
            buildPatientContext(context, (context as any)?.symptoms) +
            "\n\nCheck image quality first. If any photo is unusable or shows the wrong surface, request a retake and do not provide a confident screening result.",
        },
      ];
      for (const image of input.images) {
        content.push({
          type: "text",
          text: `Image label: ${image.side} foot, ${image.view} surface.`,
        });
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mimeType,
            data: Buffer.from(image.bytes).toString("base64"),
          },
        });
      }

      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: FOOT_ANALYSIS_SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
          output_config: {
            format: {
              type: "json_schema",
              schema: PHOTO_SCREENING_JSON_SCHEMA,
            },
          },
        }),
      });
      const payload = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        throw new Error(`Analysis provider failed with status ${upstream.status}.`);
      }
      const outputText = payload?.content?.find(
        (item: any) => item.type === "text"
      )?.text;
      if (!outputText) {
        throw new Error("Analysis provider returned no result.");
      }
      return {
        provider: "anthropic",
        modelName: model,
        modelVersion: model,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        safetyRulesVersion: SAFETY_RULES_VERSION,
        output: JSON.parse(outputText) as PhotoScreeningResult,
      };
    },
  };
}
