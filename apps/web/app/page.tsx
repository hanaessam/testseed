import type { HealthStatus } from "@testseed/types";

const status: HealthStatus = "ok";

export default function HomePage() {
  return (
    <main>
      <h1>TestSeed</h1>
      <p>Health: {status}</p>
    </main>
  );
}
