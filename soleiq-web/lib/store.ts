"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PatientProfile,
  Visit,
  CapturedImage,
  FootMesh,
  AnalysisResult,
  ScanPath,
  FootSide,
  CaptureView,
} from "./types";
import { MOCK_PRIOR_VISITS } from "./mock/priorScans";
import { saveCanonicalScreening } from "./canonicalScreenings";
import { isSupabaseConfigured } from "./supabase";

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

  /** When the returning-patient review screen sends the user off to edit
   *  one section, the edited screen's Next returns here instead of walking
   *  the rest of the questionnaire. */
  reviewReturnStep: number | null;
  editFromReview: (targetStep: number, reviewStep: number) => void;

  currentVisit: Visit | null;
  startVisit: () => void;
  addImage: (img: CapturedImage) => void;
  setImageAiResult: (
    side: FootSide,
    view: CaptureView,
    aiResult: NonNullable<CapturedImage["aiResult"]>
  ) => void;
  addMesh: (mesh: FootMesh) => void;
  setResult: (result: AnalysisResult) => void;
  completeVisit: () => Promise<{
    status: "saved" | "local" | "failed";
    reason?: string;
  }>;

  priorVisits: Visit[];

  scanPath: ScanPath;

  /** Supabase row id for this session's patient row, once synced. */
  patientDbId: string | null;

  isProcessing: boolean;
  setProcessing: (v: boolean) => void;

  reset: () => void;
}

const pickScanPath = (): ScanPath => {
  const paths: ScanPath[] = ["lidar", "tof", "photogrammetry"];
  return paths[Math.floor(Math.random() * 3)];
};

export const useSoleiqStore = create<SoleiqStore>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      direction: "forward",
      history: [],
      goNext: () =>
        set((s) => {
          // Returning-patient edit: one edited section, then straight back
          // to the review hub rather than re-walking the questionnaire.
          if (s.reviewReturnStep != null && s.currentStep !== s.reviewReturnStep) {
            return {
              direction: "forward",
              currentStep: s.reviewReturnStep,
              reviewReturnStep: null,
              history: [...s.history, s.currentStep],
            };
          }
          return {
            direction: "forward",
            currentStep: s.currentStep + 1,
            reviewReturnStep: null,
            history: [...s.history, s.currentStep],
          };
        }),
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
              reviewReturnStep: null,
            };
          }
          return {
            direction: "back",
            currentStep: Math.max(0, s.currentStep - 1),
            reviewReturnStep: null,
          };
        }),
      goTo: (step) =>
        set((s) => ({
          currentStep: step,
          direction: "forward",
          history: [...s.history, s.currentStep],
          reviewReturnStep: null,
        })),
      setStep: (step) => set({ currentStep: step }),

      profile: { conditions: [], priorEvents: [], painPoints: [] },
      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      reviewReturnStep: null,
      editFromReview: (targetStep, reviewStep) =>
        set((s) => ({
          direction: "forward",
          currentStep: targetStep,
          reviewReturnStep: reviewStep,
          history: [...s.history, s.currentStep],
        })),

      currentVisit: null,
      startVisit: () =>
        set({
          currentVisit: {
            id: `visit_${Date.now()}`,
            startedAt: Date.now(),
            images: [],
            meshes: [],
          },
        }),
      addImage: (img) =>
        set((s) =>
          s.currentVisit
            ? {
                currentVisit: {
                  ...s.currentVisit,
                  images: [
                    ...s.currentVisit.images.filter(
                      (existing) =>
                        existing.side !== img.side || existing.view !== img.view
                    ),
                    img,
                  ],
                },
              }
            : {}
        ),
      setImageAiResult: (side, view, aiResult) =>
        set((s) => {
          if (!s.currentVisit) return {};
          return {
            currentVisit: {
              ...s.currentVisit,
              images: s.currentVisit.images.map((image) =>
                image.side === side && image.view === view
                  ? {
                      ...image,
                      aiResult: { ...(image.aiResult ?? {}), ...aiResult },
                    }
                  : image
              ),
            },
          };
        }),
      addMesh: (mesh) =>
        set((s) =>
          s.currentVisit
            ? {
                currentVisit: {
                  ...s.currentVisit,
                  meshes: [...s.currentVisit.meshes, mesh],
                },
              }
            : {}
        ),
      setResult: (result) =>
        set((s) =>
          s.currentVisit
            ? { currentVisit: { ...s.currentVisit, result } }
            : {}
        ),
      completeVisit: async () => {
        const state = get();
        if (!state.currentVisit) {
          return { status: "failed", reason: "No check in progress." };
        }
        const completed = { ...state.currentVisit, completedAt: Date.now() };
        set({
          currentVisit: completed,
          priorVisits: [...state.priorVisits, completed],
        });
        if (!isSupabaseConfigured()) return { status: "local" };
        try {
          const result = await saveCanonicalScreening(state.profile, completed);
          // Either way the answers now exist for the next assessment — the
          // returning-review screen activates from here on.
          set((latest) => ({
            profile: { ...latest.profile, hasSavedIntake: true },
          }));
          if (!result.saved) {
            // Anonymous/unlinked patients keep the complete in-memory result;
            // no hospital record is invented and no default tenancy is used.
            return { status: "local", reason: result.reason };
          }
          set((latest) => ({
            currentVisit:
              latest.currentVisit?.id === completed.id
                ? { ...latest.currentVisit, id: result.sessionId }
                : latest.currentVisit,
            priorVisits: latest.priorVisits.map((visit) =>
              visit.id === completed.id
                ? { ...visit, id: result.sessionId }
                : visit
            ),
          }));
          return { status: "saved" };
        } catch (error) {
          // Surface the real step + reason to the UI — a swallowed error here
          // is exactly how "check your connection" got blamed for a server
          // configuration problem.
          console.error("[soleiq] visit save failed", error);
          return {
            status: "failed",
            reason:
              error instanceof Error ? error.message : "The save request failed.",
          };
        }
      },

      priorVisits: MOCK_PRIOR_VISITS,

      scanPath: pickScanPath(),
      patientDbId: null,

      isProcessing: false,
      setProcessing: (v) => set({ isProcessing: v }),

      reset: () =>
        set((s) => ({
          currentStep: 0,
          direction: "forward",
          history: [],
          // Answers survive into the next assessment — only the visit
          // (photos, result) starts fresh. New photos are always required.
          profile: s.profile,
          currentVisit: null,
          priorVisits: s.priorVisits,
          isProcessing: false,
          scanPath: pickScanPath(),
          reviewReturnStep: null,
        })),
    }),
    {
      name: "soleiq-session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : (undefined as never)
      ),
      // Never persist foot-photo data URLs in browser storage. Photos remain
      // in memory until the user explicitly saves them to private storage.
      partialize: (state) => ({
        profile: state.profile,
        patientDbId: state.patientDbId,
      }),
    }
  )
);
