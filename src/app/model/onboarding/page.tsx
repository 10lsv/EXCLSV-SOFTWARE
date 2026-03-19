"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const STEPS = [
  { id: "identity", label: "Identité" },
  { id: "physical", label: "Physique" },
  { id: "personality", label: "Personnalité" },
  { id: "socials", label: "Réseaux" },
  { id: "confirm", label: "Confirmation" },
];

const LANGUAGES = ["Français", "Anglais", "Espagnol", "Allemand", "Italien", "Autre"];
const TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
];
const CONTENT_TYPES = [
  "Lingerie",
  "Nude",
  "Topless",
  "Fetish",
  "Cosplay",
  "Lifestyle",
  "Fitness",
  "Couple",
  "Solo",
  "ASMR",
  "JOI",
  "Custom vidéo",
  "Dick rating",
  "Sexting",
];
const SEXUALIZATION_LEVELS = ["Soft", "Medium", "Hard", "Extreme"];

interface ProfileData {
  // identity
  name: string;
  stageName: string;
  dateOfBirth: string;
  location: string;
  timezone: string;
  occupation: string;
  languages: string[];
  photoUrl: string;
  // physical
  height: string;
  hairColor: string;
  eyeColor: string;
  tattoos: string;
  piercings: string;
  style: string;
  distinctFeatures: string;
  // personality
  personalityTraits: string;
  acceptedContent: string[];
  boundaries: string;
  sexualizationLevel: string;
  personalityNotes: string;
  // socials
  onlyfansUrl: string;
  instagramUrl: string;
  instagramHandle: string;
  tiktokUrl: string;
  tiktokHandle: string;
  twitterUrl: string;
  twitterHandle: string;
  redditUrl: string;
  redditHandle: string;
  threadsUrl: string;
  threadsHandle: string;
  otherSocials: string;
}

const defaultData: ProfileData = {
  name: "",
  stageName: "",
  dateOfBirth: "",
  location: "",
  timezone: "",
  occupation: "",
  languages: [],
  photoUrl: "",
  height: "",
  hairColor: "",
  eyeColor: "",
  tattoos: "",
  piercings: "",
  style: "",
  distinctFeatures: "",
  personalityTraits: "",
  acceptedContent: [],
  boundaries: "",
  sexualizationLevel: "",
  personalityNotes: "",
  onlyfansUrl: "",
  instagramUrl: "",
  instagramHandle: "",
  tiktokUrl: "",
  tiktokHandle: "",
  twitterUrl: "",
  twitterHandle: "",
  redditUrl: "",
  redditHandle: "",
  threadsUrl: "",
  threadsHandle: "",
  otherSocials: "",
};

// ── Shared styles ──
const inputClass =
  "h-11 w-full rounded-lg border border-[#333] bg-[#1A1A1A] px-4 text-sm text-white placeholder-white/30 outline-none transition-colors duration-200 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50";
const labelClass = "block text-sm font-medium text-white/70 mb-1";
const selectClass =
  "h-11 w-full rounded-lg border border-[#333] bg-[#1A1A1A] px-3 text-sm text-white outline-none transition-colors duration-200 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 appearance-none";
const textareaClass =
  "w-full rounded-lg border border-[#333] bg-[#1A1A1A] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors duration-200 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 resize-none";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<ProfileData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/models/onboarding")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const p = res.data;
          setData({
            name: p.user?.name || "",
            stageName: p.stageName || "",
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
            location: p.location || "",
            timezone: p.timezone || "",
            occupation: p.occupation || "",
            languages: p.languages || [],
            photoUrl: p.photoUrl || "",
            height: p.height || "",
            hairColor: p.hairColor || "",
            eyeColor: p.eyeColor || "",
            tattoos: p.tattoos || "",
            piercings: p.piercings || "",
            style: p.style || "",
            distinctFeatures: p.distinctFeatures || "",
            personalityTraits: p.personalityTraits || "",
            acceptedContent: p.acceptedContent || [],
            boundaries: p.boundaries || "",
            sexualizationLevel: p.sexualizationLevel || "",
            personalityNotes: p.personalityNotes || "",
            onlyfansUrl: p.onlyfansUrl || "",
            instagramUrl: p.instagramUrl || "",
            instagramHandle: p.instagramHandle || "",
            tiktokUrl: p.tiktokUrl || "",
            tiktokHandle: p.tiktokHandle || "",
            twitterUrl: p.twitterUrl || "",
            twitterHandle: p.twitterHandle || "",
            redditUrl: p.redditUrl || "",
            redditHandle: p.redditHandle || "",
            threadsUrl: p.threadsUrl || "",
            threadsHandle: p.threadsHandle || "",
            otherSocials:
              typeof p.otherSocials === "string"
                ? p.otherSocials
                : p.otherSocials
                  ? JSON.stringify(p.otherSocials)
                  : "",
          });
          if (p.onboardingCompleted) {
            router.replace("/model/dashboard");
            return;
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const update = useCallback(
    (field: keyof ProfileData, value: string | string[]) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const toggleArray = useCallback(
    (field: "languages" | "acceptedContent", value: string) => {
      setData((prev) => {
        const arr = prev[field];
        return {
          ...prev,
          [field]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        };
      });
    },
    []
  );

  async function saveStep(stepId: string): Promise<boolean> {
    let stepData: Record<string, unknown> = {};

    switch (stepId) {
      case "identity":
        stepData = {
          name: data.name,
          stageName: data.stageName,
          dateOfBirth: data.dateOfBirth || null,
          location: data.location || null,
          timezone: data.timezone || null,
          occupation: data.occupation || null,
          languages: data.languages,
          photoUrl: data.photoUrl || null,
        };
        break;
      case "physical":
        stepData = {
          height: data.height || null,
          hairColor: data.hairColor || null,
          eyeColor: data.eyeColor || null,
          tattoos: data.tattoos || null,
          piercings: data.piercings || null,
          style: data.style || null,
          distinctFeatures: data.distinctFeatures || null,
        };
        break;
      case "personality":
        stepData = {
          personalityTraits: data.personalityTraits || null,
          acceptedContent: data.acceptedContent,
          boundaries: data.boundaries || null,
          sexualizationLevel: data.sexualizationLevel || null,
          personalityNotes: data.personalityNotes || null,
        };
        break;
      case "socials":
        stepData = {
          onlyfansUrl: data.onlyfansUrl || null,
          instagramUrl: data.instagramUrl || null,
          instagramHandle: data.instagramHandle || null,
          tiktokUrl: data.tiktokUrl || null,
          tiktokHandle: data.tiktokHandle || null,
          twitterUrl: data.twitterUrl || null,
          twitterHandle: data.twitterHandle || null,
          redditUrl: data.redditUrl || null,
          redditHandle: data.redditHandle || null,
          threadsUrl: data.threadsUrl || null,
          threadsHandle: data.threadsHandle || null,
          otherSocials: data.otherSocials || null,
        };
        break;
      case "complete":
        stepData = {};
        break;
    }

    try {
      const res = await fetch("/api/models/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepId, data: stepData }),
      });
      const result = await res.json();
      if (!result.success) {
        setError(result.error || "Erreur lors de la sauvegarde.");
        return false;
      }
      return true;
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      return false;
    }
  }

  async function handleNext() {
    setError("");
    setSaving(true);
    const stepId = STEPS[currentStep].id;
    if (stepId !== "confirm") {
      const ok = await saveStep(stepId);
      if (!ok) {
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handlePrev() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function handleComplete() {
    setError("");
    setSaving(true);
    const ok = await saveStep("complete");
    if (!ok) {
      setSaving(false);
      return;
    }
    setCompleted(true);
    setSaving(false);
    // Full page navigation to bypass RSC cache
    setTimeout(() => {
      window.location.href = "/model/dashboard";
    }, 2500);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E91E8C] border-t-transparent" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#E91E8C]/20">
            <svg className="h-10 w-10 text-[#E91E8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Bienvenue chez EXCLSV !</h1>
          <p className="mt-3 text-white/50">Votre profil est complet. Redirection vers votre dashboard...</p>
        </div>
      </div>
    );
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const stepId = STEPS[currentStep].id;

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="w-24" />
          <Image
            src="/logo-agence-sans-fond.png"
            alt="EXCLSV"
            width={60}
            height={60}
            className="drop-shadow-[0_0_20px_rgba(233,30,140,0.3)]"
          />
          <button
            type="button"
            onClick={async () => {
              const csrfRes = await fetch("/api/auth/csrf");
              const { csrfToken } = await csrfRes.json();
              await fetch("/api/auth/signout", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `csrfToken=${csrfToken}`,
                redirect: "manual",
              });
              window.location.href = "/login";
            }}
            className="w-24 text-right text-sm text-white/40 transition-colors hover:text-[#E91E8C]"
          >
            Se déconnecter
          </button>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
          Complétez votre profil
        </h1>
        <p className="mb-8 text-center text-sm text-white/50">
          Étape {currentStep + 1} sur {STEPS.length} — {STEPS[currentStep].label}
        </p>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                className={`text-xs font-medium transition-colors ${
                  i <= currentStep ? "text-[#E91E8C]" : "text-white/30"
                } ${i < currentStep ? "cursor-pointer hover:text-[#f03a9e]" : "cursor-default"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#1A1A1A]">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-[#E91E8C] to-[#f03a9e] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#222] bg-[#111]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-sm sm:p-8">
          {/* Error message */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Identity */}
          {stepId === "identity" && (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nom complet</label>
                  <input
                    className={inputClass}
                    placeholder="Votre nom"
                    value={data.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Stage name / Pseudo</label>
                  <input
                    className={inputClass}
                    placeholder="Votre pseudo"
                    value={data.stageName}
                    onChange={(e) => update("stageName", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Date de naissance</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={data.dateOfBirth}
                    onChange={(e) => update("dateOfBirth", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Localisation</label>
                  <input
                    className={inputClass}
                    placeholder="Ville, Pays"
                    value={data.location}
                    onChange={(e) => update("location", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Fuseau horaire</label>
                  <select
                    className={selectClass}
                    value={data.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                  >
                    <option value="">Sélectionner</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Occupation</label>
                  <input
                    className={inputClass}
                    placeholder="Ce que vous faites dans la vie"
                    value={data.occupation}
                    onChange={(e) => update("occupation", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Langues parlées</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleArray("languages", lang)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                        data.languages.includes(lang)
                          ? "border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]"
                          : "border-[#333] bg-[#1A1A1A] text-white/50 hover:border-white/30"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Photo de profil (URL)</label>
                <input
                  className={inputClass}
                  placeholder="https://..."
                  value={data.photoUrl}
                  onChange={(e) => update("photoUrl", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Physical */}
          {stepId === "physical" && (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Taille</label>
                  <input
                    className={inputClass}
                    placeholder="ex: 170cm"
                    value={data.height}
                    onChange={(e) => update("height", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Couleur de cheveux</label>
                  <input
                    className={inputClass}
                    placeholder="Blonde, Brune..."
                    value={data.hairColor}
                    onChange={(e) => update("hairColor", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Couleur des yeux</label>
                <input
                  className={inputClass}
                  placeholder="Bleus, Marrons..."
                  value={data.eyeColor}
                  onChange={(e) => update("eyeColor", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Tatouages</label>
                <textarea
                  rows={2}
                  className={textareaClass}
                  placeholder="Non / Oui — décrivez (emplacement, style...)"
                  value={data.tattoos}
                  onChange={(e) => update("tattoos", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Piercings</label>
                <textarea
                  rows={2}
                  className={textareaClass}
                  placeholder="Non / Oui — décrivez (emplacement...)"
                  value={data.piercings}
                  onChange={(e) => update("piercings", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Style vestimentaire</label>
                <input
                  className={inputClass}
                  placeholder="Casual, Chic, Sportif..."
                  value={data.style}
                  onChange={(e) => update("style", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Traits distinctifs</label>
                <input
                  className={inputClass}
                  placeholder="Grain de beauté, taches de rousseur..."
                  value={data.distinctFeatures}
                  onChange={(e) => update("distinctFeatures", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Personality */}
          {stepId === "personality" && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Traits de personnalité</label>
                <textarea
                  rows={3}
                  className={textareaClass}
                  placeholder="Drôle, timide, séductrice, mystérieuse..."
                  value={data.personalityTraits}
                  onChange={(e) => update("personalityTraits", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Types de contenu acceptés</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => toggleArray("acceptedContent", ct)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                        data.acceptedContent.includes(ct)
                          ? "border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]"
                          : "border-[#333] bg-[#1A1A1A] text-white/50 hover:border-white/30"
                      }`}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-red-400 mb-1">
                  Boundaries / Limites strictes
                </label>
                <textarea
                  rows={3}
                  className={`${textareaClass} !border-red-500/30 focus:!border-red-500 focus:!ring-red-500/50`}
                  placeholder="Ce que vous refusez catégoriquement..."
                  value={data.boundaries}
                  onChange={(e) => update("boundaries", e.target.value)}
                />
                <p className="mt-1 text-xs text-red-400/60">
                  Ces limites seront strictement respectées par toute l&apos;équipe.
                </p>
              </div>
              <div>
                <label className={labelClass}>Niveau de sexualisation accepté</label>
                <div className="flex gap-2 mt-1">
                  {SEXUALIZATION_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update("sexualizationLevel", level)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                        data.sexualizationLevel === level
                          ? "border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]"
                          : "border-[#333] bg-[#1A1A1A] text-white/50 hover:border-white/30"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes libres</label>
                <textarea
                  rows={3}
                  className={textareaClass}
                  placeholder="Tout ce que vous souhaitez ajouter sur votre personnalité..."
                  value={data.personalityNotes}
                  onChange={(e) => update("personalityNotes", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: Socials */}
          {stepId === "socials" && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>OnlyFans URL</label>
                <input
                  className={inputClass}
                  placeholder="https://onlyfans.com/..."
                  value={data.onlyfansUrl}
                  onChange={(e) => update("onlyfansUrl", e.target.value)}
                />
              </div>
              {[
                { label: "Instagram", urlKey: "instagramUrl" as const, handleKey: "instagramHandle" as const },
                { label: "TikTok", urlKey: "tiktokUrl" as const, handleKey: "tiktokHandle" as const },
                { label: "Twitter / X", urlKey: "twitterUrl" as const, handleKey: "twitterHandle" as const },
                { label: "Reddit", urlKey: "redditUrl" as const, handleKey: "redditHandle" as const },
                { label: "Threads", urlKey: "threadsUrl" as const, handleKey: "threadsHandle" as const },
              ].map((social) => (
                <div key={social.label} className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{social.label} URL</label>
                    <input
                      className={inputClass}
                      placeholder={`https://${social.label.toLowerCase()}.com/...`}
                      value={data[social.urlKey]}
                      onChange={(e) => update(social.urlKey, e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{social.label} @handle</label>
                    <input
                      className={inputClass}
                      placeholder="@votre_pseudo"
                      value={data[social.handleKey]}
                      onChange={(e) => update(social.handleKey, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <div>
                <label className={labelClass}>Autres réseaux</label>
                <input
                  className={inputClass}
                  placeholder="Snapchat, Telegram, etc."
                  value={data.otherSocials}
                  onChange={(e) => update("otherSocials", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {stepId === "confirm" && (
            <div className="space-y-6">
              <SummarySection title="Identité">
                <SummaryRow label="Nom" value={data.name} />
                <SummaryRow label="Stage name" value={data.stageName} />
                <SummaryRow label="Date de naissance" value={data.dateOfBirth} />
                <SummaryRow label="Localisation" value={data.location} />
                <SummaryRow label="Fuseau horaire" value={data.timezone} />
                <SummaryRow label="Occupation" value={data.occupation} />
                <SummaryRow label="Langues" value={data.languages.join(", ")} />
              </SummarySection>
              <SummarySection title="Physique">
                <SummaryRow label="Taille" value={data.height} />
                <SummaryRow label="Cheveux" value={data.hairColor} />
                <SummaryRow label="Yeux" value={data.eyeColor} />
                <SummaryRow label="Tatouages" value={data.tattoos} />
                <SummaryRow label="Piercings" value={data.piercings} />
                <SummaryRow label="Style" value={data.style} />
                <SummaryRow label="Traits distinctifs" value={data.distinctFeatures} />
              </SummarySection>
              <SummarySection title="Personnalité">
                <SummaryRow label="Traits" value={data.personalityTraits} />
                <SummaryRow label="Contenu accepté" value={data.acceptedContent.join(", ")} />
                <SummaryRow label="Boundaries" value={data.boundaries} highlight />
                <SummaryRow label="Sexualisation" value={data.sexualizationLevel} />
                <SummaryRow label="Notes" value={data.personalityNotes} />
              </SummarySection>
              <SummarySection title="Réseaux sociaux">
                <SummaryRow label="OnlyFans" value={data.onlyfansUrl} />
                <SummaryRow label="Instagram" value={data.instagramHandle || data.instagramUrl} />
                <SummaryRow label="TikTok" value={data.tiktokHandle || data.tiktokUrl} />
                <SummaryRow label="Twitter/X" value={data.twitterHandle || data.twitterUrl} />
                <SummaryRow label="Reddit" value={data.redditHandle || data.redditUrl} />
                <SummaryRow label="Threads" value={data.threadsHandle || data.threadsUrl} />
                <SummaryRow label="Autres" value={data.otherSocials} />
              </SummarySection>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between gap-4">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="h-11 rounded-lg border border-[#333] bg-[#1A1A1A] px-6 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                Précédent
              </button>
            ) : (
              <div />
            )}

            {stepId === "confirm" ? (
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="h-11 rounded-lg bg-[#E91E8C] px-8 text-sm font-bold text-white transition-all duration-200 hover:bg-[#f03a9e] hover:shadow-[0_0_24px_rgba(233,30,140,0.45)] disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Valider mon profil"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="h-11 rounded-lg bg-[#E91E8C] px-8 text-sm font-bold text-white transition-all duration-200 hover:bg-[#f03a9e] hover:shadow-[0_0_24px_rgba(233,30,140,0.45)] disabled:opacity-50"
              >
                {saving ? "Sauvegarde..." : "Suivant"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary components ──
function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-[#E91E8C]">{title}</h3>
      <div className="space-y-1.5 rounded-lg border border-[#222] bg-[#0A0A0A] p-4">
        {children}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="shrink-0 text-white/40 w-32">{label}</span>
      <span className={highlight ? "text-red-400" : "text-white/80"}>
        {value || "—"}
      </span>
    </div>
  );
}
