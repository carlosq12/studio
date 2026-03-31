'use client';

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalculoJornadasTab } from "./components/calculo-jornadas-tab";
// import { ValidacionViaticosTab } from "./components/validacion-viaticos-tab";

export default function ValesPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <PageHeader 
        title="Vales de Alimentación" 
        description="Calcula jornadas válidas y cruza datos de viáticos con las marcaciones del reloj control." 
      />

      <Tabs defaultValue="jornadas" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="jornadas">Cálculo de Jornadas</TabsTrigger>
          <TabsTrigger value="viaticos" className="opacity-50" disabled>Validación Viáticos (Próximamente)</TabsTrigger>
        </TabsList>
        <TabsContent value="jornadas" className="mt-6">
          <CalculoJornadasTab />
        </TabsContent>
        {/* <TabsContent value="viaticos" className="mt-6">
          <ValidacionViaticosTab />
        </TabsContent> */}
      </Tabs>
    </main>
  );
}
