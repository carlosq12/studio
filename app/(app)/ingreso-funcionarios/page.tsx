import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { AddFuncionarioDialog } from "./components/add-funcionario-dialog";
import FuncionariosTable from "./components/funcionarios-table";
import { BulkUploadFuncionariosSheet } from "./components/bulk-upload-funcionarios-sheet";

export default function IngresoFuncionariosPage() {
  return (
    <main className="flex flex-col h-[calc(100vh-2rem)]">
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
            title="Ingreso de Funcionarios"
            description="Gestionar la información de los nuevos funcionarios."
        >
            <div className="flex items-center gap-2">
                <BulkUploadFuncionariosSheet />
                <AddFuncionarioDialog />
            </div>
        </PageHeader>
      </div>
      <Card className="flex-1 m-4 mt-0 sm:m-6 sm:mt-0 lg:m-8 lg:mt-0 overflow-hidden flex flex-col">
        <FuncionariosTable />
      </Card>
    </main>
  );
}
