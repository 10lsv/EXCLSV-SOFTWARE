"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* ── Left column: branding ── */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden lg:flex">
        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(233,30,140,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(233,30,140,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial glow behind logo */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(233,30,140,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-8">
          <Image
            src="/logo-agence-sans-fond.png"
            alt="EXCLSV"
            width={220}
            height={220}
            className="drop-shadow-[0_0_40px_rgba(233,30,140,0.35)]"
            priority
          />
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white xl:text-5xl">
              EXCLSV
            </h1>
            <p className="mt-3 text-lg font-medium text-white/60">
              Gerez votre agence. Dominez le game.
            </p>
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E91E8C]/40 to-transparent" />
      </div>

      {/* ── Right column: form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:max-w-[560px]">
        {/* Mobile logo */}
        <div className="mb-10 flex flex-col items-center gap-4 lg:hidden">
          <Image
            src="/logo-agence-sans-fond.png"
            alt="EXCLSV"
            width={100}
            height={100}
            className="drop-shadow-[0_0_30px_rgba(233,30,140,0.35)]"
            priority
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            EXCLSV
          </h1>
        </div>

        {/* Card */}
        <div className="w-full max-w-[420px] rounded-2xl border border-[#222] bg-[#111] p-8 shadow-2xl shadow-black/60 sm:p-10">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Connexion
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Accedez a votre espace EXCLSV
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/70"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-[#333] bg-[#1A1A1A] px-4 text-sm text-white placeholder-white/30 outline-none transition-colors duration-200 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50"
              />
            </div>

            {/* Submit */}
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
                  Connexion en cours...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Forgot password */}
          <p className="mt-6 text-center">
            <a
              href="#"
              className="text-sm text-white/40 transition-colors duration-200 hover:text-[#E91E8C]"
            >
              Mot de passe oublie ?
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-white/20">
          &copy; {new Date().getFullYear()} EXCLSV — Tous droits reserves
        </p>
      </div>
    </div>
  );
}
