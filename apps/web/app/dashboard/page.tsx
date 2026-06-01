import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight, Database, FileJson, ShieldCheck } from "lucide-react";
import Link from "next/link";

const metrics = [
  { label: "Schemas ready", value: "0" },
  { label: "Seed batches", value: "0" },
  { label: "Rollbacks", value: "0" }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="space-y-5 p-6">
        <div className="flex items-start justify-between border-b border-border pb-5">
          <div>
            <p className="font-mono text-xs text-accent">workspace.online</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Generate seed data with precision.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Start with a Mongoose schema or connect a MongoDB database, then let TestSeed prepare realistic records for review.
            </p>
          </div>
          <Button asChild>
            <Link href="/generate">
              New generation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="p-4">
                <p className="font-mono text-2xl text-foreground">{metric.value}</p>
                <p className="mt-1 text-xs text-muted">{metric.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <p className="font-mono text-xs text-accent">quick.start</p>
            <h2 className="mt-1 text-lg font-semibold">Set up your first generation run</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div className="border border-border bg-background p-4">
              <FileJson className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm font-medium">Paste schema</h3>
              <p className="mt-2 text-xs leading-5 text-muted">Use a Mongoose schema as the source of truth.</p>
            </div>
            <div className="border border-border bg-background p-4">
              <Database className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm font-medium">Inspect MongoDB</h3>
              <p className="mt-2 text-xs leading-5 text-muted">Infer collections and fields from sample documents.</p>
            </div>
            <div className="border border-border bg-background p-4">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm font-medium">Review before insert</h3>
              <p className="mt-2 text-xs leading-5 text-muted">Validate records before export or direct seeding.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
