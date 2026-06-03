"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch } from "lucide-react";

interface RepositoryContextPanelProps {
  repositoryFullName: string;
  isDisabled?: boolean;
  onRepositoryFullNameChange(repositoryFullName: string): void;
  onAuthorize(): void;
}

export function RepositoryContextPanel({
  repositoryFullName,
  isDisabled = false,
  onRepositoryFullNameChange,
  onAuthorize
}: RepositoryContextPanelProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="repository-full-name">GitHub repository</Label>
        <Input
          id="repository-full-name"
          value={repositoryFullName}
          onChange={(event) => onRepositoryFullNameChange(event.target.value)}
          placeholder="owner/repository or GitHub URL"
        />
      </div>
      <Button type="button" variant="secondary" disabled={isDisabled} onClick={onAuthorize}>
        <GitBranch className="h-4 w-4" />
        Authorize repository context
      </Button>
    </div>
  );
}
