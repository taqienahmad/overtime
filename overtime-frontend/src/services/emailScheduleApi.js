import api from "./api";

export default {
  getSchedule: () => api.get("/overtime/email-schedule"),
  updateSchedule: (data) => api.put("/overtime/email-schedule", data),
  runNow: () => api.post("/overtime/email-schedule/run-now"),
};
