'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarClock, Loader2, Trash2, WandSparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { MonthlyTemplate } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { deleteMonthlyTemplate, generateMonthlyReplacements } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function MonthlyTemplatesDialog() {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const firestore = useFirestore();
  const templatesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'reemplazos_mensuales')) : null, [firestore]);
  const { data: templates, loading } = useCollection<MonthlyTemplate>(templatesQuery);

  const currentMonthKey = format(new Date(), 'yyyy-MM');
  
  const templatesToGenerate = useMemo(() => {
      if (!templates) return [];
      return templates.filter(t => t.lastGeneratedMonth !== currentMonthKey);
  }, [templates, currentMonthKey]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateMonthlyReplacements();
      if (result.error) throw new Error(result.error);
      
      toast({
        title: '¡Generación Exitosa!',
        description: `Se han creado ${result.count} nuevas solicitudes para el mes de ${format(new Date(), 'MMMM', { locale: es })}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al generar',
        description: error.message || 'No se pudieron crear las solicitudes.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setIsDeletingId(id);
    try {
      const result = await deleteMonthlyTemplate(id);
      if (result.error) throw new Error(result.error);
      toast({
        title: 'Plantilla eliminada',
        description: 'La solicitud ya no se generará mensualmente.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarClock className="h-4 w-4" />
          Gestión Mensual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <CalendarClock className="text-primary h-6 w-6" />
            Reemplazos Mensuales Recurrentes
          </DialogTitle>
          <DialogDescription>
            Gestiona las solicitudes que se repiten todos los meses. Puedes generar los registros de este mes automáticamente.
          </DialogDescription>
        </DialogHeader>

        {templatesToGenerate.length > 0 && (
            <Alert className="bg-primary/5 border-primary/20">
                <WandSparkles className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-bold">¡Nueva generación disponible!</AlertTitle>
                <AlertDescription>
                    Tienes {templatesToGenerate.length} plantillas pendientes para generar este mes ({format(new Date(), 'MMMM', { locale: es })}).
                </AlertDescription>
            </Alert>
        )}

        <div className="py-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Tus Plantillas Guardadas</h3>
          <ScrollArea className="h-[40vh] border rounded-md p-4 bg-muted/20">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="space-y-3">
                {templates.map((template) => {
                  const isGenerated = template.lastGeneratedMonth === currentMonthKey;
                  return (
                    <div key={template.id} className="flex items-center justify-between p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate text-sm">{template['NOMBRE REEMPLAZADO']}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="font-semibold text-primary">Reemplazante:</span> {template.NOMBRE}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                            {isGenerated ? (
                                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Generado este mes
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700">
                                    <Clock className="h-3 w-3 mr-1" /> Pendiente para {format(new Date(), 'MMMM', { locale: es })}
                                </Badge>
                            )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={isDeletingId === template.id}
                      >
                        {isDeletingId === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-2 opacity-20" />
                <p>No tienes plantillas mensuales configuradas.</p>
                <p className="text-xs">Usa el botón &quot;Convertir a Mensual&quot; en cualquier solicitud para agregarla aquí.</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
          <Button 
            onClick={handleGenerate} 
            disabled={templatesToGenerate.length === 0 || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            Generar {templatesToGenerate.length} Solicitudes para {format(new Date(), 'MMMM', { locale: es })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
