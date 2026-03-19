"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ParticleBackground } from "@/components/auth/particle-background";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSent(true);
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
              Mot de passe oublié
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-[#E91E8C]/30 bg-[#E91E8C]/10 px-4 py-3 text-sm text-white/80">
                Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
              </div>
              <Link
                href="/login"
                className="block text-center text-sm text-white/40 transition-colors duration-200 hover:text-[#E91E8C]"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/70"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="vous@exclsv.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
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
                    Envoi en cours...
                  </span>
                ) : (
                  "Envoyer le lien de réinitialisation"
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
