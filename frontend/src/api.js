// ─────────────────────────────────────────────
//  api.js  —  All HTTP calls + Demo Mode intercept
//  Drop this in: frontend/src/api.js
// ─────────────────────────────────────────────
import axios from "axios";
import {
  DEMO_PROJECTS,
  DEMO_SUITES,
  DEMO_SECTIONS,
  DEMO_CASES,
  getDemoCaseDetail,
} from "./demoData";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Wraps a value to match the axios response shape: { data: value }
const mockResponse = (data) => ({ data });

// Small artificial delay so the UI loading states still flash naturally
const mockDelay = (ms = 180) => new Promise((res) => setTimeout(res, ms));

// ── Auth ──────────────────────────────────────

export const verifyAuth = (credentials) => {
  if (credentials?.demo) {
    return Promise.resolve(mockResponse({ success: true }));
  }
  return axios.post(`${BASE_URL}/api/auth/verify`, credentials);
};

// ── Projects ──────────────────────────────────

export const getProjects = async (credentials) => {
  if (credentials?.demo) {
    await mockDelay();
    return mockResponse(DEMO_PROJECTS);
  }
  return axios.post(`${BASE_URL}/api/projects/`, credentials);
};

// ── Suites ────────────────────────────────────

export const getSuites = async (credentials, projectId) => {
  if (credentials?.demo) {
    await mockDelay();
    return mockResponse(DEMO_SUITES[projectId] || []);
  }
  return axios.post(`${BASE_URL}/api/projects/${projectId}/suites`, credentials);
};

// ── Sections ──────────────────────────────────

export const getSections = async (credentials, projectId, suiteId) => {
  if (credentials?.demo) {
    await mockDelay();
    const key = `${projectId}_${suiteId}`;
    return mockResponse(DEMO_SECTIONS[key] || []);
  }
  return axios.post(
    `${BASE_URL}/api/projects/${projectId}/sections`,
    credentials,
    { params: { suite_id: suiteId } }
  );
};

// ── Cases (list) ──────────────────────────────

export const getCases = async (credentials, projectId, suiteId, sectionId) => {
  if (credentials?.demo) {
    await mockDelay();
    const cases = DEMO_CASES[sectionId] || [];
    return mockResponse({ cases });
  }
  return axios.post(`${BASE_URL}/api/cases/`, {
    ...credentials,
    project_id: projectId,
    suite_id: suiteId,
    section_id: sectionId,
  });
};

// ── Case (single) ─────────────────────────────

export const getCase = async (credentials, caseId) => {
  if (credentials?.demo) {
    await mockDelay();
    const detail = getDemoCaseDetail(caseId);
    if (!detail) throw new Error(`Demo case ${caseId} not found`);
    return mockResponse(detail);
  }
  return axios.post(`${BASE_URL}/api/cases/${caseId}`, {
    ...credentials,
    project_id: 0,
  });
};

// ── Section create ────────────────────────────

export const createSection = async (
  credentials,
  projectId,
  name,
  suiteId,
  parentId
) => {
  if (credentials?.demo) {
    await mockDelay(300);
    // Return a fake newly-created section
    return mockResponse({
      id: Date.now(),
      name,
      suite_id: suiteId,
      parent_id: parentId || null,
    });
  }
  return axios.post(
    `${BASE_URL}/api/projects/${projectId}/sections/create`,
    credentials,
    { params: { name, suite_id: suiteId, parent_id: parentId } }
  );
};