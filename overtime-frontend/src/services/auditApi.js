import api from "./api";

export default {
  getAll: (params) => api.get("/audit-logs", { params }),
};
