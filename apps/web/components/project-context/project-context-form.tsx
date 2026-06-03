"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";

interface ProjectContextFormProps {
  description: string;
  isSaving?: boolean;
  onDescriptionChange(description: string): void;
  onSubmit(): void;
}

export function ProjectContextForm({
  description,
  isSaving = false,
  onDescriptionChange,
  onSubmit
}: ProjectContextFormProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="project-context-description">Project context</Label>
        <Textarea
          id="project-context-description"
          value={description}
          maxLength={2000}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Describe the app domain, realistic entities, geography, tone, and data style."
          className="min-h-28"
        />
        <p className="font-mono text-xs text-muted">{description.length}/2000</p>
      </div>
      <Button type="button" onClick={onSubmit} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save context
      </Button>
    </div>
  );
}
