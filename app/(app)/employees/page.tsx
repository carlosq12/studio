import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import EmployeesTable from "./components/employees-table";
import { AddEmployeeDialog } from "./components/add-employee-dialog";
import { BulkUploadSheet } from "./components/bulk-upload-sheet";

export default function EmployeesPage() {
  return (
    <main className="flex flex-col h-[calc(100vh-2rem)]">
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
            title="Dotación de Personal"
            description="Gestionar la información personal de los empleados, contactos y documentos."
        >
            <div className="flex items-center gap-2">
                <BulkUploadSheet />
                <AddEmployeeDialog />
            </div>
        </PageHeader>
      </div>
      <Card className="flex-1 m-4 mt-0 sm:m-6 sm:mt-0 lg:m-8 lg:mt-0 overflow-hidden">
        <div className="h-full flex flex-col">
            <EmployeesTable />
        </div>
      </Card>
    </main>
  );
}
