"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelForm } from "@/components/models/model-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { CreateModelInput } from "@/lib/validations/model";

export default function NewModelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: CreateModelInput) {
    setLoading(true);
    setError("");

    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!json.success) {
      setError(json.error);
      setLoading(false);
      return;
    }

    router.push("/admin/models");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ajouter une modèle
          </h1>
          <p className="text-sm text-muted-foreground">
            Remplissez les informations pour créer un nouveau profil
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ModelForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
