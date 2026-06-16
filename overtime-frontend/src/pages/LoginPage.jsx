import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../services/authApi";
import { Alert, Button, Input } from "../components/ui";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const result = await authApi.login({ email, password });

      localStorage.setItem("token", result.data.token);
      localStorage.setItem("user", JSON.stringify(result.data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login gagal. Periksa email/password."
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo.png" alt="Logo" className="mb-3 h-16 w-16 object-contain" />
          <h1 className="text-2xl font-semibold text-slate-800">Overtime System</h1>
          <p className="text-sm text-slate-500">Masuk untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </label>

          <Alert type="error">{error}</Alert>

          <Button type="submit" variant="danger" className="w-full">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
