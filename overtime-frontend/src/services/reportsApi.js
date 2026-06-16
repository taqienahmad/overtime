import api from "./api";

export default {
  getSummary: (params) => api.get("/reports/summary", { params }),
  getByProject: (params) => api.get("/reports/by-project", { params }),
  getEmailLogs: () => api.get("/reports/email-logs"),
  getUploads: () => api.get("/reports/uploads"),
  getStorage: () => api.get("/reports/storage"),
  deleteStorageFile: (fileName) => api.delete(`/reports/storage/${fileName}`),
  resetDatabase: (password) => api.post("/reports/reset-database", { password }),
};
