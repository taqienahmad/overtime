import { useState } from "react";
import { Alert, Button, Input } from "./ui";

export default function ResetDatabaseModal({ onConfirm, onCancel }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onConfirm(password);
    } catch (err) {
      setError(err.message || "Gagal membersihkan data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-slate-800">
          Konfirmasi Reset Data Transaksi
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Masukkan password akun admin Anda untuk melanjutkan. Tindakan ini akan
          menghapus seluruh data transaksi overtime dan tidak dapat dibatalkan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Password admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            required
            autoFocus
          />

          <Alert type="error">{error}</Alert>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? "Memproses..." : "Reset Sekarang"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
