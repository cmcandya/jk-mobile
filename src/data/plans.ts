// Plan data — mirrors web app's mockData.ts
// Will be replaced with Supabase queries when plans move to the database

export type Plan = {
  id: string;
  sheetNumber: string;
  title: string;
  folderId: string | null;
  currentVersion: string;
  currentVersionDate: string;
  thumbnailUrl: string | null;
  pdfUrl: string;
  tags: string[];
};

export type PlanFolder = {
  id: string;
  name: string;
  planCount: number;
};

export const folders: PlanFolder[] = [
  { id: "folder-1", name: "Architectural", planCount: 6 },
  { id: "folder-2", name: "Electrical", planCount: 5 },
  { id: "folder-3", name: "Mechanical", planCount: 3 },
  { id: "folder-4", name: "Structural", planCount: 3 },
];

export const plans: Plan[] = [
  // Architectural (folder-1)
  { id: "plan-1", sheetNumber: "A1.0", title: "FLOOR PLAN - LEVEL 1", folderId: "folder-1", currentVersion: "v3", currentVersionDate: "2026-01-22", thumbnailUrl: null, pdfUrl: "/mock/plans/A1.0.pdf", tags: ["Approved"] },
  { id: "plan-2", sheetNumber: "A1.1", title: "FLOOR PLAN - LEVEL 2", folderId: "folder-1", currentVersion: "v2", currentVersionDate: "2026-01-20", thumbnailUrl: null, pdfUrl: "/mock/plans/A1.1.pdf", tags: ["Approved"] },
  { id: "plan-3", sheetNumber: "A2.0", title: "EXTERIOR ELEVATIONS", folderId: "folder-1", currentVersion: "v2", currentVersionDate: "2026-01-18", thumbnailUrl: null, pdfUrl: "/mock/plans/A2.0.pdf", tags: ["Approved"] },
  { id: "plan-4", sheetNumber: "A2.1", title: "EXTERIOR ELEVATIONS", folderId: "folder-1", currentVersion: "v2", currentVersionDate: "2026-01-18", thumbnailUrl: null, pdfUrl: "/mock/plans/A2.1.pdf", tags: ["Approved"] },
  { id: "plan-5", sheetNumber: "A3.0", title: "BUILDING SECTIONS", folderId: "folder-1", currentVersion: "v1", currentVersionDate: "2025-12-01", thumbnailUrl: null, pdfUrl: "/mock/plans/A3.0.pdf", tags: [] },
  { id: "plan-6", sheetNumber: "A4.0", title: "ROOF PLAN", folderId: "folder-1", currentVersion: "v1", currentVersionDate: "2025-12-05", thumbnailUrl: null, pdfUrl: "/mock/plans/A4.0.pdf", tags: ["For Review"] },

  // Electrical (folder-2)
  { id: "plan-7", sheetNumber: "E1.0", title: "ELECTRICAL SITE PLAN", folderId: "folder-2", currentVersion: "v2", currentVersionDate: "2026-01-15", thumbnailUrl: null, pdfUrl: "/mock/plans/E1.0.pdf", tags: ["Approved"] },
  { id: "plan-8", sheetNumber: "E1.1", title: "ELECTRICAL FLOOR PLAN", folderId: "folder-2", currentVersion: "v3", currentVersionDate: "2026-01-25", thumbnailUrl: null, pdfUrl: "/mock/plans/E1.1.pdf", tags: ["Revision"] },
  { id: "plan-9", sheetNumber: "E1.2", title: "ELECTRICAL FLOOR PLAN", folderId: "folder-2", currentVersion: "v2", currentVersionDate: "2026-01-10", thumbnailUrl: null, pdfUrl: "/mock/plans/E1.2.pdf", tags: ["Approved"] },
  { id: "plan-10", sheetNumber: "E1.3", title: "SITE LIGHTING PLAN", folderId: "folder-2", currentVersion: "v1", currentVersionDate: "2026-01-28", thumbnailUrl: null, pdfUrl: "/plans/E1.3-site-lighting-plan.pdf", tags: ["For Review"] },
  { id: "plan-11", sheetNumber: "E2.0", title: "PANEL SCHEDULES", folderId: "folder-2", currentVersion: "v1", currentVersionDate: "2025-12-10", thumbnailUrl: null, pdfUrl: "/mock/plans/E2.0.pdf", tags: ["For Review"] },

  // Mechanical (folder-3)
  { id: "plan-12", sheetNumber: "M1.0", title: "HVAC FLOOR PLAN", folderId: "folder-3", currentVersion: "v2", currentVersionDate: "2026-01-12", thumbnailUrl: null, pdfUrl: "/mock/plans/M1.0.pdf", tags: ["Approved"] },
  { id: "plan-13", sheetNumber: "M1.1", title: "HVAC FLOOR PLAN", folderId: "folder-3", currentVersion: "v2", currentVersionDate: "2026-01-12", thumbnailUrl: null, pdfUrl: "/mock/plans/M1.1.pdf", tags: ["Approved"] },
  { id: "plan-14", sheetNumber: "M2.0", title: "MECHANICAL SCHEDULES", folderId: "folder-3", currentVersion: "v1", currentVersionDate: "2025-12-15", thumbnailUrl: null, pdfUrl: "/mock/plans/M2.0.pdf", tags: [] },

  // Structural (folder-4)
  { id: "plan-15", sheetNumber: "S1.0", title: "FOUNDATION PLAN", folderId: "folder-4", currentVersion: "v2", currentVersionDate: "2026-01-08", thumbnailUrl: null, pdfUrl: "/mock/plans/S1.0.pdf", tags: ["Approved"] },
  { id: "plan-16", sheetNumber: "S2.0", title: "FRAMING PLAN", folderId: "folder-4", currentVersion: "v3", currentVersionDate: "2026-01-20", thumbnailUrl: null, pdfUrl: "/mock/plans/S2.0.pdf", tags: ["Approved"] },
  { id: "plan-17", sheetNumber: "S2.1", title: "FRAMING PLAN", folderId: "folder-4", currentVersion: "v2", currentVersionDate: "2026-01-15", thumbnailUrl: null, pdfUrl: "/mock/plans/S2.1.pdf", tags: ["Approved"] },

  // Unfiled (null folder)
  { id: "plan-18", sheetNumber: "C1.0", title: "SITE PLAN", folderId: null, currentVersion: "v1", currentVersionDate: "2025-11-01", thumbnailUrl: null, pdfUrl: "/mock/plans/C1.0.pdf", tags: ["Approved"] },
  { id: "plan-19", sheetNumber: "G1.0", title: "COVER SHEET & INDEX", folderId: null, currentVersion: "v4", currentVersionDate: "2026-01-26", thumbnailUrl: null, pdfUrl: "/mock/plans/G1.0.pdf", tags: ["Revision"] },
];
