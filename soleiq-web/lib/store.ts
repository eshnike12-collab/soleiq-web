"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PatientProfile,
  Visit,
  CapturedImage,
  AnalysisResult,
  FootSide,
  CaptureView,
} from "./types";
import { MOCK_PRIOR_VISITS } from "./mock/priorScans";
import { syncCompleteVisit } from "./db";

interface SoleiqStore {
  currentStep: number;
  goNext: () => void;
  goBack: () => void;
  goTo: (step: number) => void;
  /** Internal: change step without touching the navigation history stack. */
  setStep: (step: number) => void;
  direction: "forward" | "back";
  /** Stack of previously-visited steps. Back-button pops; navigations push. */
  history: number[];

  profile: Partial<PatientProfile>;
  updateProfile: (patch: Partial<PatientProfile>) => void;

  currentVisit: Visit | null;
  startVisit: () => void;
  addImage: (img: CapturedImage) => void;
  /**
   * Merge a per-image AI result onto an existing captured image, keyed by
   * (side, view). Called from analyzeFootImage() as the fire-and-forget
   * AI reply arrives. No-op if the target image no longer exists (user
   * reset the visit before the reply landed).
   */
  setImageAiResult: (
    side: FootSide,
    view: CaptureView,
    aiResult: NonNullable<CapturedImage["aiResult"]>,
  ) => void;
  setResult: (result: AnalysisResult) => void;
  completeVisit: () => void;

  priorVisits: Visit[];

  /** Supabase row id for this session's patient row, once synced. */
  patientDbId: string | null;

  isProcessing: boolean;
  setProcessing: (v: boolean) => void;

  reset: () => void;
}

export const useSoleiqStore = create<SoleiqStore>()(
  persist(
    (set) => ({
      currentStep: 0,
      direction: "forward",
      history: [],
      goNext: () =>
        set((s) => ({
          direction: "forward",
          currentStep: s.currentStep + 1,
          history: [...s.history, s.currentStep],
        })),
      goBack: () =>
        set((s) => {
          // Pop from history if available — gives correct back behavior even
          // for jumps like Next Steps → Timeline (which would otherwise
          // decrement to a non-adjacent step that doesn't make sense).
          if (s.history.length > 0) {
            return {
              direction: "back",
              currentStep: s.history[s.history.length - 1],
              history: s.history.slice(0, -1),
            };
          }
          return {
            direction: "back",
            currentStep: Math.max(0, s.currentStep - 1),
          };
        }),
      goTo: (step) =>
        set((s) => ({
          currentStep: step,
          direction: "forward",
          history: [...s.history, s.currentStep],
        })),
      setStep: (step) => set({ currentStep: step }),

      profile: { conditions: [], priorEvents: [], painPoints: [] },
      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      currentVisit: null,
      startVisit: () =>
        set({
          currentVisit: {
            id: `visit_${Date.now()}`,
            startedAt: Date.now(),
            images: [],
          },
        }),
      addImage: (img) =>
        set((s) => {
          if (!s.currentVisit) return {};
          // One image per (side, view) per visit. A re-capture — whether via
          // the live shutter, a manual click, or an upload — REPLACES the
          // prior entry instead of appending. Without this guard the visit
          // accumulates duplicates whenever the user navigates back to a
          // view and recaptures, and downstream consumers using `.find()`
          // silently return the stale first match.
          const others = s.currentVisit.images.filter(
            (i) => !(i.side === img.side && i.view === img.view)
          );
          return {
            currentVisit: {
              ...s.currentVisit,
              images: [...others, img],
            },
          };
        }),
      setImageAiResult: (side, view, aiResult) =>
        set((s) => {
          if (!s.currentVisit) return {};
          const images = s.currentVisit.images.map((i) =>
            i.side === side && i.view === view
              ? { ...i, aiResult: { ...(i.aiResult ?? {}), ...aiResult } }
              : i
          );
          return {
            currentVisit: { ...s.currentVisit, images },
          };
        }),
      setResult: (result) =>
        set((s) =>
          s.currentVisit
            ? { currentVisit: { ...s.currentVisit, result } }
            : {}
        ),
      completeVisit: () =>
        set((s) => {
          if (!s.currentVisit) return {};
          const completed = { ...s.currentVisit, completedAt: Date.now() };
          // Fire-and-forget remote sync — never blocks UI.
          void syncCompleteVisit(
            s.profile,
            completed,
            s.patientDbId ?? undefined
          ).then(({ patientId }) => {
            if (patientId && patientId !== s.patientDbId) {
              useSoleiqStore.setState({ patientDbId: patientId });
            }
          });
          return {
            currentVisit: completed,
            priorVisits: [...s.priorVisits, completed],
          };
        }),

      priorVisits: MOCK_PRIOR_VISITS,

      patientDbId: null,

      isProcessing: false,
      setProcessing: (v) => set({ isProcessing: v }),

      reset: () =>
        set({
          currentStep: 0,
          direction: "forward",
          history: [],
          profile: { conditions: [], priorEvents: [], painPoints: [] },
          currentVisit: null,
          priorVisits: MOCK_PRIOR_VISITS,
          isProcessing: false,
          patientDbId: null,
        }),
    }),
    {
      name: "soleiq-session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : (undefined as never)
      ),
    }
  )
);
