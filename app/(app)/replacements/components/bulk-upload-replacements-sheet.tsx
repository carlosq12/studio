
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
import { addMultipleReplacements } from '../actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ReplacementData = {
  'FECHA DE INGRESO DOC': Date | null;
  NOMBRE: string;
  MES: string;
  CARGO: string;
  FUNCIONES: string;
  UNIDAD: string;
  DESDE: Date;
  HASTA: Date;
  'NOMBRE REEMPLAZADO': string;
  MOTIVO: string;
  OBSERVACION: string;
  IMAGEN: string;
  ESTADO: string;
  'JEFE SERVICIO': string;
  CORREO: string;
  'ESTADO R/NR': string;
  'FECHA DEL AVISO': Date | null;
  AÑO: string;
  'NUMERO RES': string;
};

const requiredFields: (keyof ReplacementData)[] = [
    'NOMBRE',
    'NOMBRE REEMPLAZADO',
    'DESDE',
    'HASTA'
];


export function BulkUploadReplacementsSheet() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ReplacementData[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFileName(selectedFile.name);
      parseExcel(selectedFile);
    }
  };

  const excelSerialDateToJSDate = (serial: number): Date | null => {
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
    if (typeof value === 'number') {
        const date = excelSerialDateToJSDate(value);
        if (date && !isNaN(date.getTime())) return date;
    }
    if (typeof value === 'string') {
        const isoDate = new Date(value);
        if (!isNaN(isoDate.getTime())) return isoDate;
        const parts = value.match(/(\d+)[/-](\d+)[/-](\d+)/);
        if (parts) {
            let day = parseInt(parts[1], 10), month = parseInt(parts[2], 10), year = parseInt(parts[3], 10);
            if (year < 100) year += (year > 50 ? 1900 : 2000);
            if (month > 12 && day <=12) [day, month] = [month, day];
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
        }
    }
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    return null;
  }

  const normalizeHeader = (header: string): string => {
      if (typeof header !== 'string') return '';
      return header.toUpperCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
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
          
          const replacements = dataRows.map((row): ReplacementData | null => {
              const rowData: Record<string, any> = {};
              normalizedHeaders.forEach((header, index) => {
                  if(header) rowData[header] = row[index];
              });
              
              const replacement: Partial<ReplacementData> = {
                  'FECHA DE INGRESO DOC': parseDate(rowData['FECHA DE INGRESO DOC']),
                  'NOMBRE': String(rowData['NOMBRE'] || '').trim(),
                  'MES': String(rowData['MES'] || '').trim(),
                  'CARGO': String(rowData['CARGO'] || '').trim(),
                  'FUNCIONES': String(rowData['FUNCIONES'] || '').trim(),
                  'UNIDAD': String(rowData['UNIDAD'] || '').trim(),
                  'DESDE': parseDate(rowData['DESDE']) || undefined,
                  'HASTA': parseDate(rowData['HASTA']) || undefined,
                  'NOMBRE REEMPLAZADO': String(rowData['NOMBRE REEMPLAZADO'] || '').trim(),
                  'MOTIVO': String(rowData['MOTIVO'] || '').trim(),
                  'OBSERVACION': String(rowData['OBSERVACION'] || '').trim(),
                  'IMAGEN': String(rowData['IMAGEN'] || '').trim(),
                  'ESTADO': String(rowData['ESTADO'] || '').trim(),
                  'JEFE SERVICIO': String(rowData['JEFE SERVICIO'] || '').trim(),
                  'CORREO': String(rowData['CORREO'] || '').trim(),
                  'ESTADO R/NR': String(rowData['ESTADO R/NR'] || '').trim(),
                  'FECHA DEL AVISO': parseDate(rowData['FECHA DEL AVISO']),
                  'AÑO': String(rowData['AÑO'] || '').trim(),
                  'NUMERO RES': String(rowData['NUMERO RES'] || '').trim(),
              };

              for (const field of requiredFields) {
                  const value = replacement[field as keyof ReplacementData];
                   if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                       return null; 
                   }
              }
              
              return replacement as ReplacementData;
          }).filter((f): f is ReplacementData => f !== null);

          setParsedData(replacements);

          if (replacements.length === 0 && dataRows.length > 0) {
            toast({
                variant: 'destructive',
                title: 'No se encontraron registros válidos',
                description: 'Revisa que las columnas requeridas (NOMBRE, NOMBRE REEMPLAZADO, DESDE, HASTA) no estén vacías.',
                duration: 9000,
            });
          }
        }
      } catch (error) {
          console.error("Error al procesar el archivo Excel:", error);
          toast({
              variant: 'destructive',
              title: 'Error al leer el archivo',
              description: 'El archivo podría estar dañado o tener un formato incorrecto.'
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
        description: 'Por favor, selecciona un archivo de Excel válido con reemplazos.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addMultipleReplacements(parsedData as any);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Carga Masiva Exitosa!',
        description: `${result.count} reemplazos han sido añadidos a la lista.`,
      });
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo realizar la carga masiva. Inténtalo de nuevo.',
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
          <SheetTitle>Carga Masiva de Reemplazos</SheetTitle>
           <SheetDescription>
            Sube un archivo Excel. El sistema leerá los encabezados de la primera fila. Asegúrate de que los nombres de las columnas coincidan con los de la base de datos (ej. &apos;NOMBRE REEMPLAZADO&apos;, &apos;JEFE SERVICIO&apos;, etc.).
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
                      <TableHead>Reemplazado</TableHead>
                      <TableHead>Reemplazante</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row['NOMBRE REEMPLAZADO']}</TableCell>
                        <TableCell>{row.NOMBRE}</TableCell>
                        <TableCell>{row.DESDE ? row.DESDE.toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{row.HASTA ? row.HASTA.toLocaleDateString() : 'N/A'}</TableCell>
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
