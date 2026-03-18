"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ModelListItem {
  id: string;
  stageName: string;
  location: string | null;
  languages: string[];
  photoUrl: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string };
  _count: { chatterAssignments: number };
}

export default function AdminModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    const res = await fetch(`/api/models?${params}`);
    const json = await res.json();
    if (json.success) {
      setModels(json.data.models);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchModels, 300);
    return () => clearTimeout(timeout);
  }, [fetchModels]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modèles</h1>
          <p className="text-sm text-muted-foreground">
            {total} modèle{total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Button onClick={() => router.push("/admin/models/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une modèle
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, localisation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Aucune modèle pour le moment</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Commencez par ajouter votre première modèle
          </p>
          <Button onClick={() => router.push("/admin/models/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une modèle
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Photo</TableHead>
                <TableHead>Nom de scène</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Langues</TableHead>
                <TableHead className="text-center">Chatters</TableHead>
                <TableHead>Date d&apos;ajout</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={model.photoUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {model.stageName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/models/${model.id}`}
                      className="hover:underline"
                    >
                      {model.stageName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {model.location || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {model.languages.length > 0
                        ? model.languages.map((lang) => (
                            <Badge key={lang} variant="secondary" className="text-xs">
                              {lang}
                            </Badge>
                          ))
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {model._count.chatterAssignments}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(model.createdAt), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/admin/models/${model.id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/admin/models/${model.id}?edit=true`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
