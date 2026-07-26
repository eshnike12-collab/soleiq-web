import "server-only";

import type { PhotoScreeningResult } from "@/lib/types";

export interface AnalysisImage {
  side: "left" | "right";
  view: "top" | "sole";
  mimeType: string;
  bytes: Uint8Array;
}

export interface AnalysisProviderInput {
  screeningSessionId: string;
  images: AnalysisImage[];
  context: Record<string, unknown>;
}

export interface AnalysisProviderResult {
  provider: string;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
  schemaVersion: string;
  safetyRulesVersion: string;
  output: PhotoScreeningResult;
}

export interface AnalysisProvider {
  analyze(input: AnalysisProviderInput): Promise<AnalysisProviderResult>;
}

