import axiosClient from "./axiosClient";

// ─── Batch CRUD ─────────────────────────────────────────────────────
export const createBatch = (data) => axiosClient.post("/batches", data);
export const fetchAllBatches = () => axiosClient.get("/batches");

// ─── Phase 1: unassigned → batch ────────────────────────────────────
export const fetchUnassignedUsers = () => axiosClient.get("/batches/unassigned-users");
export const assignUsersToBatch = (batchId, userIds) =>
  axiosClient.post("/batches/assign-users", { batchId, userIds });

// ─── Phase 2: batch → institute ─────────────────────────────────────
export const fetchUsersWithoutInstitute = (batchId) =>
  axiosClient.get(`/batches/${batchId}/without-institute`);
export const assignUsersToInstitute = (batchId, userIds, institute) =>
  axiosClient.post("/batches/assign-institute", { batchId, userIds, institute });

// ─── Phase 3: institute → branch ────────────────────────────────────
export const fetchUsersWithoutBranch = (batchId, institute) =>
  axiosClient.get(`/batches/${batchId}/${institute}/without-branch`);
export const assignUsersToBranch = (batchId, institute, userIds, branch) =>
  axiosClient.post("/batches/assign-branch", { batchId, institute, userIds, branch });

// ─── Phase 4: branch → division ─────────────────────────────────────
export const fetchUsersWithoutDivision = (batchId, institute, branch) =>
  axiosClient.get(`/batches/${batchId}/${institute}/${branch}/without-division`);
export const assignUsersToDivision = (batchId, institute, branch, userIds, division) =>
  axiosClient.post("/batches/assign-division", { batchId, institute, branch, userIds, division });

// ─── Dashboard helpers ──────────────────────────────────────────────
export const fetchUsersByBatch = () => axiosClient.get("/batches/dashboard/by-batch");
export const fetchDistinctInstitutes = (batchId) =>
  axiosClient.get(`/batches/${batchId}/institutes`);
export const fetchDistinctBranches = (batchId, institute) =>
  axiosClient.get(`/batches/${batchId}/${institute}/branches`);

// ─── Monitor ────────────────────────────────────────────────────────
export const fetchPendingRequests = () => axiosClient.get("/monitor/requests");
export const reviewRequest = (requestId, decision) =>
  axiosClient.post("/monitor/requests/review", { requestId, decision });