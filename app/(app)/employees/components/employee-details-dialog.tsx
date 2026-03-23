'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { Employee } from '@/lib/types';

interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-base font-semibold">{value || 'N/A'}</p>
  </div>
);

export function EmployeeDetailsDialog({ employee, open, onOpenChange }: EmployeeDetailsDialogProps) {
  if (!employee) return null;

  const fullName = `${employee['NOMBRE FUNCIONARIO']} ${employee['APELLIDO PATERNO']} ${employee['APELLIDO MATERNO']}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">{fullName}</DialogTitle>
          <DialogDescription>
            Detalles completos del empleado.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4">
          <DetailItem label="RUT" value={employee.RUT} />
          <DetailItem label="Cargo/Título" value={employee.TITULO} />
          <DetailItem label="Fecha de Ingreso" value={employee['FECHA DE INGRESO']} />
          <DetailItem label="Unidad o Servicio" value={employee['UNIDAD O SERVICIO']} />
          <DetailItem label="Jefatura" value={employee.JEFATURA} />
          <DetailItem label="Estamento" value={employee.ESTAMENTO} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
