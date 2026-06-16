import api from "./api";

export default {
  getApprovalReminder: () => api.get("/email-templates/approval-reminder"),
  updateApprovalReminder: (data) => api.put("/email-templates/approval-reminder", data),
};
