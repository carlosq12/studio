'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, ChangeEvent } from 'react';
import { UploadCloud, Loader2, File, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addMultipleEmployees } from '../actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type EmployeeData = {
  'FECHA DE INGRESO': string;
  RUT: string;
  'NOMBRE FUNCIONARIO': string;
  'APELLIDO PATERNO': string;
  'APELLIDO MATERNO': string;
  TITULO: string;
  'UNIDAD O SERVICIO': string;
  ESTAMENTO: string;
  JEFATURA: string;
};

const columnOrder: (keyof EmployeeData)[] = [
    'RUT',
    'NOMBRE FUNCIONARIO',
    'APELLIDO PATERNO',
    'APELLIDO MATERNO',
    'ESTAMENTO',
    'UNIDAD O SERVICIO',
    'JEFATURA',
    'FECHA DE INGRESO',
    'TITULO'
];

export function BulkUploadSheet() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<EmployeeData[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      parseExcel(selectedFile);
    }
  };

  const excelSerialDateToJSDate = (serial: number) => {
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
  }

  const parseExcel = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (typeof data === 'string' || data instanceof ArrayBuffer) {
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
        
        const header = json[0];
        const rows = json.slice(1);

        const employees: EmployeeData[] = rows.map(row => {
          const employee: Partial<EmployeeData> = {};
          columnOrder.forEach((key, index) => {
              let value = row[index];
              
              if (value === undefined || value === null) {
                value = '';
              }

              if (key === 'FECHA DE INGRESO') {
                 if (typeof value === 'number') {
                    value = excelSerialDateToJSDate(value).toISOString().split('T')[0];
                 } else if (typeof value === 'string') {
                    const parts = value.split(/[-/]/);
                    if (parts.length === 3) {
                      let year = parseInt(parts[2], 10);
                      let month = parseInt(parts[1], 10);
                      let day = parseInt(parts[0], 10);

                      if (parts[2].length === 2) year += 2000;
                      
                      // Handle MM/DD/YYYY vs DD/MM/YYYY
                      if (month > 12) {
                        [day, month] = [month, day]; // Swap if month is likely the day
                      }

                      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                        value = new Date(year, month - 1, day).toISOString().split('T')[0];
                      } else {
                        value = '';
                      }
                    } else if (value.trim() === '') {
                        value = '';
                    }
                 } else {
                    value = '';
                 }
              }
              (employee as any)[key] = String(value);
          });
          return employee as EmployeeData;
        }).filter(emp => emp.RUT && emp['NOMBRE FUNCIONARIO'] && emp['APELLIDO PATERNO']);

        setParsedData(employees);
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };
  
  const resetState = () => {
    setFile(null);
    setFileName('');
    setParsedData([]);
    setIsSubmitting(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetState();
    }
  }

  async function onSubmit() {
    if (parsedData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay datos para cargar',
        description: 'Por favor, selecciona un archivo de Excel válido con empleados.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addMultipleEmployees(parsedData);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Carga Masiva Exitosa!',
        description: `${result.count} empleados han sido añadidos a la lista.`,
      });
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description:
          error.message ||
          'No se pudo realizar la carga masiva. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <UploadCloud className="mr-2 h-4 w-4" />
          Carga Masiva
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Carga Masiva de Empleados</SheetTitle>
          <SheetDescription>
            Sube un archivo de Excel (.xlsx, .xls, .csv) para añadir múltiples
            empleados a la vez. Las columnas deben estar en el siguiente orden: RUT, Nombre, Apellido Paterno, Apellido Materno, Estamento, Unidad, Jefatura, Fecha Ingreso, Título.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div
            className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold text-foreground">
              Haz clic para subir o arrastra y suelta
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Archivos Excel (XLSX, XLS, CSV)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
            />
          </div>
          {fileName && (
            <div className="flex items-center justify-center p-3 bg-muted rounded-md text-sm">
              <File className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-medium">{fileName}</span>
            </div>
          )}
          {parsedData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">
                Previsualización de Datos ({parsedData.length} registros)
              </h3>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RUT</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.RUT}</TableCell>
                        <TableCell>{`${row['NOMBRE FUNCIONARIO']} ${row['APELLIDO PATERNO']}`}</TableCell>
                        <TableCell>{row.TITULO}</TableCell>
                        <TableCell>{row['FECHA DE INGRESO']}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground py-2">... y {parsedData.length - 5} más.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || parsedData.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
                <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Cargar {parsedData.length} Empleados
                </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
