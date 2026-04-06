import { Suspense } from "react";
import ProjectsClientPage from "./projects-client";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
      <ProjectsClientPage />
    </Suspense>
  );
}
