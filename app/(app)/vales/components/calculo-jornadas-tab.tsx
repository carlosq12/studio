'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { 
  calcularJornadasAvanzado, 
  JornadaResult, 
  MarcacionRow, 
  FuncionarioInfo,
  exportToExcel
} from "../utils/calculos";

const parseExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
        resolve(sheetData);
      } catch(err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export function CalculoJornadasTab() {
  const { toast } = useToast();
  const [marcacionesFile, setMarcacionesFile] = useState<File | null>(null);
  const [funcionariosFile, setFuncionariosFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultados, setResultados] = useState<JornadaResult[] | null>(null);

  const handleProcess = async () => {
    if (!marcacionesFile) {
      toast({
        variant: "destructive",
        title: "Archivo faltante",
        description: "Debes subir el reporte de Marcaciones para proceder."
      });
      return;
    }

    setIsLoading(true);
    setResultados(null);

    try {
      // 1. Process Funcionarios if provided
      const funcMap: Record<string, FuncionarioInfo> = {};
      if (funcionariosFile) {
         const rawFunc = await parseExcel(funcionariosFile);
         rawFunc.forEach((row: any) => {
            // Find AC keys regardless of casing
            const keys = Object.keys(row);
            const acKey = keys.find(k => k.toLowerCase().includes('ac-no') || k.toLowerCase().includes('ac - no'));
            const nameKey = keys.find(k => k.toLowerCase() === 'nombre');
            const jornadaKey = keys.find(k => k.toLowerCase().includes('jornada'));
            const rutKey = keys.find(k => k.toLowerCase() === 'rut');

            if (acKey && row[acKey]) {
               const valAc = String(row[acKey]).trim();
               funcMap[valAc] = {
                 acNo: valAc,
                 nombre: nameKey ? String(row[nameKey]).trim() : "",
                 jornadaTipo: jornadaKey ? String(row[jornadaKey]).trim().toLowerCase() as any : "desconocido",
                 rut: rutKey ? String(row[rutKey]).trim() : ""
               };
            }
         });
      }

      // 2. Process Marcaciones
      const rawMarcaciones = await parseExcel(marcacionesFile);
      const marcaciones: MarcacionRow[] = [];
      
      rawMarcaciones.forEach((row: any) => {
          const keys = Object.keys(row);
          const acKey = keys.find(k => k.toLowerCase().includes('ac-no') || k.toLowerCase().includes('ac - no'));
          const nameKey = keys.find(k => k.toLowerCase() === 'nombre');
          const timeKey = keys.find(k => k.toLowerCase() === 'horario' || k.toLowerCase().includes('fecha'));
          const statusKey = keys.find(k => k.toLowerCase() === 'estado' || k.toLowerCase() === 'estado nombre');

          if (acKey && timeKey && statusKey) {
             marcaciones.push({
               acNo: String(row[acKey]).trim(),
               nombre: nameKey ? String(row[nameKey]).trim() : "",
               horario: row[timeKey], // can be string or excel date number
               estado: String(row[statusKey]).trim()
             });
          }
      });

      if (marcaciones.length === 0) {
        throw new Error("No se encontraron registros de marcaciones válidos. Verifica el formato de las columnas ('AC-No.', 'Horario', 'Estado').");
      }

      // 3. Execute logic
      const result = calcularJornadasAvanzado(marcaciones, funcMap);
      setResultados(result);

      toast({
        title: "Cálculo Completado",
        description: `Se procesaron ${marcaciones.length} registros y se generó el resultado para ${result.length} funcionarios.`,
      });

    } catch (err: any) {
       console.error(err);
       toast({
         variant: "destructive",
         title: "Error de procesamiento",
         description: err.message || "Ocurrió un error leyendo los archivos."
       });
    } finally {
       setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if(!resultados) return;
    const exportData = resultados.map(r => ({
      "AC-No.": r.acNo,
      "Nombre Funcionario": r.nombre,
      "Tipo de Jornada": r.jornadaTipo,
      "Jornadas Válidas": r.jornadasValidas,
      "Marcajes Faltantes": r.noMarcajes,
      "Errores de Marcación": r.errores.join(' | ')
    }));
    exportToExcel(exportData, `Vales_Resultados_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card className="fancy-border-card">
        <CardHeader>
          <CardTitle>Generación de Vales de Alimentación</CardTitle>
          <CardDescription>
            Sube el reporte de marcaciones y la base de funcionarios para calcular los vales generados según el tipo de jornada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Marcaciones Input */}
            <div className="space-y-3">
              <Label>1. Reporte de Marcaciones (Requerido)</Label>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${marcacionesFile ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/30'}
                `}
              >
                <Input 
                   type="file" 
                   accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                   className="hidden" 
                   id="file-marcaciones"
                   onChange={(e) => setMarcacionesFile(e.target.files?.[0] || null)}
                />
                <Label htmlFor="file-marcaciones" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <div className={`p-3 rounded-full ${marcacionesFile ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  {marcacionesFile ? (
                    <div className="text-sm font-semibold">{marcacionesFile.name}</div>
                  ) : (
                     <>
                        <div className="text-sm font-medium">Sube el CSV o Excel de Marcaciones</div>
                        <div className="text-xs text-muted-foreground">Debe contener: AC-No., Horario y Estado</div>
                     </>
                  )}
                </Label>
              </div>
            </div>

            {/* Funcionarios Input */}
            <div className="space-y-3">
              <Label>2. Base de Funcionarios (Opcional)</Label>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${funcionariosFile ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/30'}
                `}
              >
                <Input 
                   type="file" 
                   accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                   className="hidden" 
                   id="file-funcionarios"
                   onChange={(e) => setFuncionariosFile(e.target.files?.[0] || null)}
                />
                <Label htmlFor="file-funcionarios" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <div className={`p-3 rounded-full ${funcionariosFile ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  {funcionariosFile ? (
                    <div className="text-sm font-semibold">{funcionariosFile.name}</div>
                  ) : (
                     <>
                        <div className="text-sm font-medium">Sube el listado de funcionarios</div>
                        <div className="text-xs text-muted-foreground">Debe contener: AC-No. y Jornada ("normal", "turno")</div>
                     </>
                  )}
                </Label>
              </div>
            </div>

          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t py-4">
          <Button onClick={handleProcess} disabled={isLoading || !marcacionesFile} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {isLoading ? 'Calculando...' : 'Calcular Jornadas Válidas'}
          </Button>
        </CardFooter>
      </Card>

      {/* Resultados Table */}
      {resultados && (
        <Card>
           <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Resultados Obtenidos</CardTitle>
                <CardDescription>Resumen de vales generados y errores encontrados.</CardDescription>
              </div>
              <Button onClick={downloadReport} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Exportar a Excel
              </Button>
           </CardHeader>
           <CardContent>
              <div className="rounded-md border overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-muted text-muted-foreground font-medium">
                          <tr>
                             <th className="px-4 py-3">AC-No.</th>
                             <th className="px-4 py-3 min-w-[150px]">Nombre</th>
                             <th className="px-4 py-3">Jornada</th>
                             <th className="px-4 py-3 text-center">Jornadas Válidas (Vales)</th>
                             <th className="px-4 py-3 text-center">Marcajes Faltantes</th>
                             <th className="px-4 py-3">Errores Detectados</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {resultados.map((row, i) => (
                             <tr key={i} className={row.errores.length > 2 ? 'bg-red-50 hover:bg-red-100/80 transition-colors' : 'hover:bg-muted/50 transition-colors'}>
                                <td className="px-4 py-3 font-medium">{row.acNo}</td>
                                <td className="px-4 py-3">{row.nombre}</td>
                                <td className="px-4 py-3 capitalize">{row.jornadaTipo}</td>
                                <td className="px-4 py-3 text-center font-bold text-base">{row.jornadasValidas}</td>
                                <td className="px-4 py-3 text-center">
                                  {row.noMarcajes > 0 ? (
                                    <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                                      {row.noMarcajes} faltantes
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {row.errores.length > 0 ? (
                                    <div className="flex flex-col gap-1 text-xs text-red-600">
                                      {row.errores.map((err, j) => (
                                         <span key={j} className="flex items-start gap-1">
                                           <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {err}
                                         </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Sin errores</span>
                                  )}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </CardContent>
        </Card>
      )}
    </div>
  );
}
