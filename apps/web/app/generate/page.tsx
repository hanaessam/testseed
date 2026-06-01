import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

export default function GeneratePage() {
  return (
    <AppShell>
      <section className="flex min-h-screen flex-col">
        <div className="flex items-end gap-3 border-b border-border bg-background p-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="project-description">Project description</Label>
            <Input id="project-description" placeholder="E-commerce API with users, products, orders, and reviews" />
          </div>
          <Button>
            <Sparkles className="h-4 w-4" />
            Generate
          </Button>
        </div>

        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_420px] gap-4 p-4">
          <Card className="flex min-h-[calc(100vh-104px)] flex-col">
            <CardHeader>
              <p className="font-mono text-xs text-accent">schema.input</p>
              <h1 className="mt-1 text-lg font-semibold">Mongoose schema</h1>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <Textarea
                className="flex-1"
                spellCheck={false}
                placeholder={`const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["admin", "member"] }
});`}
              />
            </CardContent>
          </Card>

          <Card className="flex min-h-[calc(100vh-104px)] flex-col">
            <CardHeader>
              <p className="font-mono text-xs text-accent">preview.output</p>
              <h2 className="mt-1 text-lg font-semibold">Generated data</h2>
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="max-w-xs text-center">
                <div className="mx-auto h-2 w-2 animate-pulse bg-accent" />
                <p className="mt-4 text-sm text-foreground">No records generated yet.</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Paste a schema and run generation to preview records grouped by collection.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
