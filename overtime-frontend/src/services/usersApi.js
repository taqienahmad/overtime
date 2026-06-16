import api from "./api";

export default {
  getAll: () => api.get("/users"),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  resetPassword: (id, password) => api.patch(`/users/${id}/reset-password`, { password }),
};
