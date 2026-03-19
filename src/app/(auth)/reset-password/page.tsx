"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ParticleBackground } from "@/components/auth/particle-background";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!data.success) {
      setError(data.error || "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <>
      <ParticleBackground />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 flex flex-col items-center gap-4 lg:hidden">
          <Image
            src="/logo-agence-sans-fond.png"
            alt="EXCLSV"
            width={120}
            height={120}
            className="drop-shadow-[0_0_35px_rgba(233,30,140,0.35)]"
            priority
          />
        </div>

        {/* Card */}
        <div className="w-full max-w-[420px] rounded-2xl border border-[#222] bg-[#111111]/95 p-8 shadow-2xl shadow-black/60 backdrop-blur-sm sm:p-10">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Nouveau mot de passe
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Choisissez votre nouveau mot de passe
            </p>
          </div>

          {!token ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                Lien invalide. Veuillez refaire une demande de réinitialisation.
              </div>
              <Link
                href="/forgot-password"
                className="block text-center text-sm text-white/40 transition-colors duration-200 hover:text-[#E91E8C]"
              >
                Demander un nouveau lien
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                Mot de passe modifié avec succès !
              </div>
              <Link
                href="/login"
                className="block h-12 w-full rounded-lg bg-[#E91E8C] text-center text-sm font-bold leading-[48px] text-white transition-all duration-200 hover:bg-[#f03a9e] hover:shadow-[0_0_24px_rgba(233,30,140,0.45)]"
              >
                Se connecter
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/70"
                >
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11 w-full rounded-lg border border-[#333] bg-[#1A1A1A] px-4 text-sm text-white placeholder-white/30 outline-none transition-colors duration-200 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-white/70"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm"
                  type="password"
                  placeholder="Retapez le mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11 w-full rounded-lg border border-[#333] bg-[#1A1A1A] px-4 text-sm text-white placeholder-white/30 outline-none transition-colors duration-200 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative h-12 w-full rounded-lg bg-[#E91E8C] text-sm font-bold text-white transition-all duration-200 hover:bg-[#f03a9e] hover:shadow-[0_0_24px_rgba(233,30,140,0.45)] disabled:opacity-50 disabled:hover:shadow-none"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 018-8"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="opacity-75"
                      />
                    </svg>
                    Réinitialisation...
                  </span>
                ) : (
                  "Réinitialiser mon mot de passe"
                )}
              </button>

              <Link
                href="/login"
                className="block text-center text-sm text-white/40 transition-colors duration-200 hover:text-[#E91E8C]"
              >
                Retour à la connexion
              </Link>
            </form>
          )}
        </div>

        <p className="mt-8 text-xs text-white/20">
          &copy; {new Date().getFullYear()} EXCLSV — Tous droits réservés
        </p>
      </div>
    </>
  );
}
