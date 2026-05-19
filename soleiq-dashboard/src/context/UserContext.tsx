import React, { createContext, useContext, useMemo } from 'react';

export const MOCK_USER = {
  id: "usr_001",
  firstName: "Margaret",
  lastName: "Torres",
  email: "margaret.t@email.com",
  avatarInitials: "MT",
  memberSince: "2024-09-15",
  medicalProfile: {
    diabetesType: "Type 2",
    diagnosedYear: 2012,
    hba1c: 7.8,
    neuropathyStage: "Moderate",
    neuropathyScore: 62,
    vascularRisk: "Moderate",
    bmi: 28.4,
    age: 60,
    gender: "Female",
    primaryCareProvider: "Dr. James Reyes, DPM",
    lastClinicVisit: "2026-02-14",
    nextClinicVisit: "2026-04-18",
    medications: ["Metformin 1000mg", "Lisinopril 10mg", "Atorvastatin 20mg"],
    allergies: ["Penicillin"],
    footHistory: {
      priorDFU: true,
      priorDFUSite: "Right metatarsal head (2023)",
      priorAmputations: false,
      calluses: "Bilateral metatarsal heads",
    }
  },
  devices: {
    smartInsole: {
      connected: true,
      model: "SoleIQ SI-3",
      firmwareVersion: "2.1.4",
      batteryLeft: 67,
      batteryRight: 71,
      lastSync: "2026-03-28T07:42:00Z",
      wearTimeToday: 4.2,
      wearTimeGoal: 8,
    },
    pbmSlipper: {
      connected: true,
      model: "SoleIQ PBM-S1",
      lastSession: "2026-03-27T20:15:00Z",
      totalSessionsThisWeek: 5,
      totalSessionsAllTime: 87,
    },
    pbmPods: { connected: false }
  },
  riskAssessment: {
    overallRiskScore: 68,
    overallRiskLevel: "Elevated",
    trend: "improving",
    trendDelta: -4,
    lastUpdated: "2026-03-28T07:42:00Z",
    zoneRisks: {
      rightHallux: 45, rightMet1: 82, rightMet2: 71, rightMet3: 58,
      rightMet4: 41, rightMet5: 38, rightArch: 22, rightHeel: 35,
      leftHallux: 38, leftMet1: 52, leftMet2: 48, leftMet3: 44,
      leftMet4: 31, leftMet5: 29, leftArch: 18, leftHeel: 28,
    },
    hotspots: [
      { zone: "Right 1st Metatarsal Head", score: 82, tempDelta: 2.1, pressure: "High", alert: true },
      { zone: "Right 2nd Metatarsal Head", score: 71, tempDelta: 1.4, pressure: "Elevated", alert: false },
      { zone: "Left 1st Metatarsal Head", score: 52, tempDelta: 0.8, pressure: "Moderate", alert: false },
    ],
  },
  plantarData: {
    currentPressureMap: {
      rightFoot: [45, 82, 71, 58, 41, 38, 22, 35, 28, 19, 44],
      leftFoot: [38, 52, 48, 44, 31, 29, 18, 28, 21, 15, 36],
    },
    currentTemperatureMap: {
      rightFoot: [32.1, 34.2, 33.8, 33.1, 32.4, 32.0, 31.8, 32.2, 31.9, 31.6, 32.5],
      leftFoot: [32.0, 32.9, 32.7, 32.5, 32.1, 31.9, 31.7, 32.0, 31.8, 31.5, 32.3],
    },
    temperatureAsymmetry: { maxDelta: 2.1, alertThreshold: 2.0, status: "Watch" },
    gaitMetrics: {
      symmetryScore: 74,
      stepsToday: 4218,
      stepGoal: 6000,
      cadence: 98,
      archType: "Low Arch (Flat)",
      gaitPhaseBalance: { heelStrike: 28, midstance: 41, propulsion: 31 }
    }
  },
  historicalData: {
    riskScoreTrend: [
      { date: "2026-02-26", score: 79, event: null },
      { date: "2026-02-28", score: 76, event: null },
      { date: "2026-03-02", score: 78, event: "Missed PBM session" },
      { date: "2026-03-04", score: 74, event: null },
      { date: "2026-03-06", score: 72, event: null },
      { date: "2026-03-08", score: 75, event: "Long walking day" },
      { date: "2026-03-10", score: 71, event: null },
      { date: "2026-03-12", score: 70, event: null },
      { date: "2026-03-14", score: 73, event: null },
      { date: "2026-03-16", score: 69, event: null },
      { date: "2026-03-18", score: 67, event: null },
      { date: "2026-03-20", score: 70, event: "Skipped offloading insoles" },
      { date: "2026-03-22", score: 68, event: null },
      { date: "2026-03-24", score: 66, event: null },
      { date: "2026-03-26", score: 69, event: null },
      { date: "2026-03-28", score: 68, event: null },
    ],
    temperatureAsymmetryTrend: [
      { date: "2026-02-26", delta: 2.8 },
      { date: "2026-03-01", delta: 2.5 },
      { date: "2026-03-05", delta: 2.3 },
      { date: "2026-03-10", delta: 2.2 },
      { date: "2026-03-15", delta: 2.1 },
      { date: "2026-03-20", delta: 2.4 },
      { date: "2026-03-25", delta: 2.1 },
      { date: "2026-03-28", delta: 2.1 },
    ],
    pbmAdherence: [true, true, false, true, true, true, false, true, true, true, false, true, true, true],
    wearTimeAdherence: [7.2, 6.8, 4.1, 7.5, 8.0, 6.9, 5.5, 7.8, 8.1, 7.3, 6.6, 8.0, 7.9, 4.2],
  },
  therapyProtocol: {
    pbmProtocol: {
      sessionDuration: 30,
      frequency: "Daily",
      wavelengthMode: "Combined (660nm + 850nm)",
      heatLevel: "Medium (90%)",
      targetZones: ["Right 1st Metatarsal Head", "Right 2nd Metatarsal Head"],
      rationale: "Your elevated risk score (68) and moderate peripheral neuropathy indicate compromised mitochondrial function in the right forefoot. A 30-minute combined dual-spectrum session at medium heat activates CCO-mediated ATP synthesis in deep tissue while stimulating surface microcirculation.",
      expectedOutcome: "15–25% reduction in right forefoot hotspot intensity within 2–3 weeks of consistent daily sessions.",
      nextSession: "Tonight, 8:00 PM",
      streakDays: 11,
    },
    offloadingProtocol: {
      primaryOffloadZone: "Right forefoot (Met heads 1–2)",
      insoleConfiguration: "High-density GEL pad at right 1st–2nd metatarsal; medium cushion across bilateral heels",
      activityLimit: "Avoid >6,000 steps on days with risk score >75",
      footwearRecommendation: "Extra-depth therapeutic footwear with rocker sole",
      rationale: "Your gait symmetry score (74/100) and right forefoot loading bias indicate compensatory weight transfer.",
    },
    clinicalAlerts: [
      {
        severity: "Watch",
        title: "Temperature Asymmetry Monitoring",
        detail: "Right 1st metatarsal temperature is 2.1°C above the contralateral site — at clinical watch threshold (>2.0°C). This pattern has persisted for 4 days.",
        timestamp: "2026-03-28T07:42:00Z",
        actionRequired: false,
      },
      {
        severity: "Info",
        title: "PBM Session Due Tonight",
        detail: "Your 11-day streak continues. Tonight's recommended 30-minute session targets the right forefoot.",
        timestamp: "2026-03-28T06:00:00Z",
        actionRequired: false,
      }
    ],
    careTeam: {
      primaryProvider: "Dr. James Reyes, DPM",
      nextEscalationTrigger: "Risk score >80 OR temperature asymmetry >2.5°C for 7+ days",
      escalationStatus: "Monitoring — no escalation required",
      lastClinicalReview: "2026-02-14",
    }
  },
  subscription: {
    plan: "SoleIQ Pro",
    status: "Active",
    renewalDate: "2026-09-15",
    devices: ["Smart Insole", "PBM Slipper"],
  }
};

type MockUserType = typeof MOCK_USER;

interface UserContextType {
  user: MockUserType;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Allow the SoleIQ admin to deep-link a specific patient via URL params:
  //   ?userId=...&userName=...&userEmail=...
  // We merge those over the mock user so the dashboard reflects who the admin
  // is impersonating without needing a real backend.
  const user = useMemo(() => {
    if (typeof window === 'undefined') return MOCK_USER;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    if (!userId) return MOCK_USER;

    const userName = params.get('userName') || '';
    const userEmail = params.get('userEmail') || MOCK_USER.email;
    const [firstName, ...rest] = userName.split(' ');
    const lastName = rest.join(' ');
    const initials =
      ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() ||
      MOCK_USER.avatarInitials;

    return {
      ...MOCK_USER,
      id: userId,
      firstName: firstName || MOCK_USER.firstName,
      lastName: lastName || MOCK_USER.lastName,
      email: userEmail,
      avatarInitials: initials,
    };
  }, []);

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
