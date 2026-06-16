import api from "./api";

export default {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
};
