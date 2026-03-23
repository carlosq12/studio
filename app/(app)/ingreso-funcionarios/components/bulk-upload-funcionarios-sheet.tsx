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
import { addMultipleFuncionarios } from '../actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type FuncionarioData = {
  FECHA_DE_INGRESO: Date | null;
  RUT: string;
  NOMBRES: string;
  'APELLIDO P': string;
  'APELLIDO M'?: string;
  TELEFONO?: string;
  FECHA_DE_NACIMIENTO: Date | null;
  LUGAR_NACIMIENTO?: string;
  DIRECCION?: string;
  CORREO?: string;
  AFP?: string;
  SALUD?: string;
  BANCO?: string;
  TIPO_DE_CUENTA?: string;
  'N_CUENTA'?: string;
  NOMBRE_ISAPRE?: string;
  ESTADO?: string;
  'N_RELOJ_CONTROL'?: string;
  CARGO: string;
};

const requiredFields: (keyof FuncionarioData)[] = [
    'RUT'
];


export function BulkUploadFuncionariosSheet() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<FuncionarioData[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFileName(selectedFile.name);
      parseExcel(selectedFile);
    }
  };

  const excelSerialDateToJSDate = (serial: number) => {
    if (serial < 1) return null;
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    const finalDate = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    return isNaN(finalDate.getTime()) ? null : finalDate;
  }

  const parseDate = (value: any): Date | null => {
    if (value === null || value === undefined || value === '') return null;
    
    // Handle Excel serial date format
    if (typeof value === 'number') {
        const date = excelSerialDateToJSDate(value);
        if (date && !isNaN(date.getTime())) return date;
    }

    // Handle string dates (e.g., "DD/MM/YYYY", "DD-MM-YYYY", ISO)
    if (typeof value === 'string') {
        const isoDate = new Date(value);
        if (!isNaN(isoDate.getTime())) return isoDate;

        const parts = value.match(/(\d+)[/-](\d+)[/-](\d+)/);
        if (parts) {
            let day = parseInt(parts[1], 10);
            let month = parseInt(parts[2], 10);
            let year = parseInt(parts[3], 10);

            if (year < 100) year += (year > 50 ? 1900 : 2000);
            
            // Handle DD/MM vs MM/DD ambiguity
            if (month > 12 && day <=12) {
                [day, month] = [month, day];
            }

            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
        }
    }
    
    // Last resort for JS Date objects from library
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value;
    }

    return null;
  }

  const normalizeHeader = (header: string): string => {
      if (typeof header !== 'string') return '';
      return header.toUpperCase().replace(/_|\./g, ' ').replace(/\s+/g, ' ').trim();
  }

  const parseExcel = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (typeof data === 'string' || data instanceof ArrayBuffer) {
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

          if (json.length < 2) {
              setParsedData([]);
              toast({ variant: 'destructive', title: 'Archivo vacío', description: 'El archivo Excel no contiene datos.' });
              return;
          }

          const headerRow: string[] = json[0].map(h => String(h || '').trim());
          const normalizedHeaders: string[] = headerRow.map(normalizeHeader);
          
          const dataRows = json.slice(1);
          
          const funcionarios = dataRows.map((row, rowIndex): FuncionarioData | null => {
              const rowData: Record<string, any> = {};
              normalizedHeaders.forEach((header, index) => {
                  if(header) rowData[header] = row[index];
              });
              
              const funcionario: Partial<FuncionarioData> = {
                  FECHA_DE_INGRESO: parseDate(rowData['FECHA DE INGRESO']),
                  RUT: String(rowData['RUT'] || '').trim(),
                  NOMBRES: String(rowData['NOMBRES'] || '').trim(),
                  'APELLIDO P': String(rowData['APELLIDO P'] || '').trim(),
                  'APELLIDO M': String(rowData['APELLIDO M'] || '').trim(),
                  TELEFONO: String(rowData['TELEFONO'] || '').trim(),
                  FECHA_DE_NACIMIENTO: parseDate(rowData['FECHA DE NACIMIENTO']),
                  LUGAR_NACIMIENTO: String(rowData['LUGAR NACIMIENTO'] || '').trim(),
                  DIRECCION: String(rowData['DIRECCION'] || '').trim(),
                  CORREO: String(rowData['CORREO'] || '').trim(),
                  AFP: String(rowData['AFP'] || '').trim(),
                  SALUD: String(rowData['SALUD'] || '').trim(),
                  BANCO: String(rowData['BANCO'] || '').trim(),
                  TIPO_DE_CUENTA: String(rowData['TIPO DE CUENTA'] || '').trim(),
                  N_CUENTA: String(rowData['N CUENTA'] || '').trim(),
                  NOMBRE_ISAPRE: String(rowData['NOMBRE ISAPRE'] || '').trim(),
                  ESTADO: String(rowData['ESTADO'] || '').trim(),
                  N_RELOJ_CONTROL: String(rowData['N RELOJ CONTROL'] || '').trim(),
                  CARGO: String(rowData['CARGO'] || '').trim(),
              };

              for (const field of requiredFields) {
                  const value = funcionario[field as keyof FuncionarioData];
                   if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                       return null; 
                   }
              }
              
              return funcionario as FuncionarioData;
          }).filter((f): f is FuncionarioData => f !== null);

          setParsedData(funcionarios);

          if (funcionarios.length === 0 && dataRows.length > 0) {
            toast({
                variant: 'destructive',
                title: 'No se encontraron registros válidos',
                description: 'Revisa que la columna RUT no esté vacía en ninguna fila.',
                duration: 9000,
            });
          }
        }
      } catch (error) {
          console.error("Error al procesar el archivo Excel:", error);
          toast({
              variant: 'destructive',
              title: 'Error al leer el archivo',
              description: 'El archivo podría estar dañado o tener un formato incorrecto. Revisa la consola para más detalles.'
          });
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };
  
  const resetState = () => {
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
        description: 'Por favor, selecciona un archivo de Excel válido con funcionarios.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addMultipleFuncionarios(parsedData);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Carga Masiva Exitosa!',
        description: `${result.count} funcionarios han sido añadidos a la lista.`,
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
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Carga Masiva de Funcionarios</SheetTitle>
           <SheetDescription>
            Sube un archivo Excel. El sistema leerá los encabezados de la primera fila. Asegúrate de que los nombres de las columnas coincidan con los de la base de datos (ej. 'FECHA DE INGRESO', 'APELLIDO P', etc.).
            <br/> <strong className="font-bold text-foreground mt-2 block">Nombres de columnas esperados:</strong> FECHA_DE_INGRESO, RUT, NOMBRES, APELLIDO P, APELLIDO M, TELEFONO, FECHA_DE_NACIMIENTO, LUGAR_NACIMIENTO, DIRECCION, CORREO, AFP, SALUD, BANCO, TIPO_DE_CUENTA, N_CUENTA, NOMBRE_ISAPRE, ESTADO, N_RELOJ_CONTROL, CARGO.
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{`${row.NOMBRES} ${row['APELLIDO P']}`}</TableCell>
                        <TableCell>{row.CARGO}</TableCell>
                        <TableCell>{row.FECHA_DE_INGRESO ? row.FECHA_DE_INGRESO.toLocaleDateString() : 'N/A'}</TableCell>
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
                Cargar {parsedData.length} Registros
                </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
