import axios from "axios";

const BASE_URL = "http://localhost:8000";

export const verifyAuth = (credentials) =>
  axios.post(`${BASE_URL}/api/auth/verify`, credentials);

export const getProjects = (credentials) =>
  axios.post(`${BASE_URL}/api/projects/`, credentials);

export const getSuites = (credentials, projectId) =>
  axios.post(`${BASE_URL}/api/projects/${projectId}/suites`, credentials);

export const getSections = (credentials, projectId, suiteId) =>
  axios.post(`${BASE_URL}/api/projects/${projectId}/sections`, credentials, {
    params: { suite_id: suiteId },
  });

export const getCases = (credentials, projectId, suiteId, sectionId) =>
  axios.post(`${BASE_URL}/api/cases/`, {
    ...credentials,
    project_id: projectId,
    suite_id: suiteId,
    section_id: sectionId,
  });

export const getCase = (credentials, caseId) =>
  axios.post(`${BASE_URL}/api/cases/${caseId}`, {
    ...credentials,
    project_id: 0,
  });

export const createSection = (credentials, projectId, name, suiteId, parentId) =>
  axios.post(`${BASE_URL}/api/projects/${projectId}/sections/create`, credentials, {
    params: { name, suite_id: suiteId, parent_id: parentId },
  });