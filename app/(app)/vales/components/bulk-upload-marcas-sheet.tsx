'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileSpreadsheet, Loader2, Save, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { processMarcasMasivas } from '../actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function BulkUploadMarcasSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mesTarget, setMesTarget] = useState<string>('');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseExcel(selectedFile);
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        setParsedData(json);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error al leer el archivo',
          description: 'Asegúrate de que es un archivo Excel (.xlsx o .xls) válido.',
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'RUT': '12345678-9',
        'Dias Trabajados': 20,
        'Ausencias': 1,
        'Monto': 100000,
      },
      {
        'RUT': '9876543-2',
        'Dias Trabajados': 22,
        'Ausencias': 0,
        'Monto': 110000,
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marcas");
    XLSX.writeFile(wb, "Plantilla_Marcas_Vales.xlsx");
  };

  const handleSave = async () => {
    if (parsedData.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'El archivo está vacío o no se ha leído correctamente.' });
      return;
    }
    if (!mesTarget) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona a qué MES corresponde este archivo de marcas.' });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processMarcasMasivas(parsedData, mesTarget);
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Carga completada',
        description: `Se han cruzado y guardado las marcas para ${result.count} funcionarios. ${(result.missing || 0) > 0 ? `\nAtención: ${result.missing || 0} RUTs del Excel no existen en la BD de Vales.` : ''}`,
      });

      setIsOpen(false);
      setFile(null);
      setParsedData([]);
      setMesTarget('');
    } catch (error: any) {
      toast({
         variant: 'destructive',
         title: 'Error durante la importación',
         description: error.message || 'Error inesperado',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generador de los últimos y próximos meses de forma sencilla
  const generateMonthsOptions = () => {
      const options = [];
      const currentDate = new Date();
      for (let i = -3; i <= 1; i++) {
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
          const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          options.push({ value: val, label: val });
      }
      return options;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="w-full sm:w-auto">
          <UploadCloud className="mr-2 h-4 w-4" />
          Subir Registro de Marcas
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Carga de Marcas (Asistencia) para Vales</SheetTitle>
          <SheetDescription>
            Sube el archivo Excel extraído del reloj control. El sistema emparejará usando la columna <b>RUT</b> contra la Base de Datos de funcionarios en el sistema.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border">
            <div className="flex flex-col">
               <span className="text-sm font-semibold">Descargar Plantilla Base</span>
               <span className="text-xs text-muted-foreground">Estructura requerida para evitar errores.</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Plantilla
            </Button>
          </div>

          <div className="space-y-3">
             <Label htmlFor="mesVales">Selecciona el Mes del Registro</Label>
             <Select value={mesTarget} onValueChange={setMesTarget}>
                <SelectTrigger id="mesVales">
                    <SelectValue placeholder="Ej: 2024-10" />
                </SelectTrigger>
                <SelectContent>
                    {generateMonthsOptions().map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="bulk-upload">Archivo Excel</Label>
            <Input id="bulk-upload" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          </div>

          {file && (
            <Card>
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{parsedData.length} registros (filas) detectados.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button 
                onClick={handleSave} 
                className="bg-green-600 hover:bg-green-700"
                disabled={!file || parsedData.length === 0 || isProcessing || !mesTarget}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando cruzamiento...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Procesar {parsedData.length} registros
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
