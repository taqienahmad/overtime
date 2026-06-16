import api from "./api";

export default {
  getAll: () => api.get("/project-recipients"),
  create: (data) => api.post("/project-recipients", data),
  remove: (id) => api.delete(`/project-recipients/${id}`),
  downloadTemplate: () =>
    api.get("/project-recipients/template", { responseType: "blob" }),
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post("/project-recipients/bulk-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
