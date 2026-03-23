import { PageHeader } from "@/components/page-header";
import IntelligentAssignmentClient from "./components/intelligent-assignment-client";

export default function IntelligentAssignmentPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Asignación Inteligente de Tareas"
        description="Recomendaciones potenciadas por IA para la asignación óptima de tareas."
      />
      <IntelligentAssignmentClient />
    </main>
  );
}
