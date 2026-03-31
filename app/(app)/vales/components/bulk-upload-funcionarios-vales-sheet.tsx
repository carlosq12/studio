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
import { uploadFuncionariosValesMasivos } from '../actions';

export function BulkUploadFuncionariosValesSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
        'AC-No.': '1359',
        'Nombres': 'ROBERTO',
        'Apellidos': 'ESPINA',
        'Jornada': 'T1',
        'RUT': '13598655-0',
        'Departamento': 'Operaciones',
        'Estado': 'Activo'
      },
      {
        'AC-No.': '1178',
        'Nombres': 'ROSA',
        'Apellidos': 'AVILES',
        'Jornada': 'N3',
        'RUT': '11787648-9',
        'Departamento': 'Administración',
        'Estado': 'Activo'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Funcionarios_Vales");
    XLSX.writeFile(wb, "Plantilla_Funcionarios_Vales.xlsx");
  };

  const handleSave = async () => {
    if (parsedData.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'El archivo está vacío o no se ha leído correctamente.' });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await uploadFuncionariosValesMasivos(parsedData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Importación completada',
        description: `Se han guardado ${result.count} funcionarios en la base de datos de Vales de forma exitosa.`,
      });

      setIsOpen(false);
      setFile(null);
      setParsedData([]);
    } catch (error: any) {
      toast({
         variant: 'destructive',
         title: 'Error durante la importación',
         description: error.message || 'Ocurrió un error inesperado al guardar los funcionarios.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">
          <UploadCloud className="mr-2 h-4 w-4" />
          Carga Masiva
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Carga Masiva de Funcionarios (Vales)</SheetTitle>
          <SheetDescription>
            Sube un archivo Excel para registrar múltiples funcionarios a la vez en esta base de datos, para no tener que agregarlos 1 a 1.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border">
            <div className="flex flex-col">
               <span className="text-sm font-semibold">Descargar Plantilla Base</span>
               <span className="text-xs text-muted-foreground">Usa estos nombres de columnas exactos.</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Plantilla
            </Button>
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="funcionarios-upload">Archivo Excel</Label>
            <Input id="funcionarios-upload" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          </div>

          {file && (
            <Card>
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{parsedData.length} funcionarios detectados.</p>
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
                disabled={!file || parsedData.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando {parsedData.length} registros...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Guardar Todos
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
