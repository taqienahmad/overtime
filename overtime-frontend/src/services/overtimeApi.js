import api from "./api";

export default {
  downloadUploadTemplate: () =>
    api.get("/overtime/upload-template", { responseType: "blob" }),
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post("/overtime/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getPending: () => api.get("/overtime/pending"),
  getGrouped: () => api.get("/overtime/grouped"),
  getTrend: (days = 14) => api.get("/overtime/trend", { params: { days } }),
  getHistory: () => api.get("/overtime/history"),
  deleteHistory: () => api.delete("/overtime/history"),
  createApprovalSession: (data) => api.post("/overtime/approval-session", data),
  sendApprovalEmail: (data) => api.post("/overtime/send-email", data),
  getApprovalByToken: (token) => api.get(`/overtime/approval/${token}`),
  submitApproval: (token, data) => api.post(`/overtime/approval-submit/${token}`, data),
};
