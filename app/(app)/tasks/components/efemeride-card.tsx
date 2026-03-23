'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Mail, Trash2, Users, UserCheck, BellRing, RotateCcw, Loader2, Send, MailCheck, MailWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Efemeride, IngresoFuncionario, EfemerideNotificationLog } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clearEfemerideNotificationLogs, manualSendEfemerideNotification } from '../actions';
import { useToast } from '@/hooks/use-toast';

interface EfemerideCardProps {
  efemeride: Efemeride;
  funcionarios: IngresoFuncionario[];
  logs: EfemerideNotificationLog[];
  onEdit: () => void;
  onDelete: () => void;
}

export function EfemerideCard({ efemeride, funcionarios, logs, onEdit, onDelete }: EfemerideCardProps) {
  const [showEmails, setShowEmails] = useState(false);
  const [resetTarget, setResetTarget] = useState<'encargados' | 'afectos' | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isSendingManual, setIsSendingManual] = useState<'encargados' | 'afectos' | null>(null);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  
  const currentYearLogs = useMemo(() => {
    return logs.filter(log => 
        log.efemerideId === efemeride.id && 
        log.date.startsWith(currentYear.toString())
    );
  }, [logs, efemeride.id, currentYear]);

  const notifiedEncargados = useMemo(() => currentYearLogs.some(l => l.type.includes('encargados')), [currentYearLogs]);
  const notifiedAfectos = useMemo(() => currentYearLogs.some(l => l.type.includes('afectos')), [currentYearLogs]);

  const lastEncargadosLog = useMemo(() => {
      return currentYearLogs.filter(l => l.type.includes('encargados')).sort((a, b) => {
          const dateA = a.sentAt?.toDate?.() || new Date(a.sentAt);
          const dateB = b.sentAt?.toDate?.() || new Date(b.sentAt);
          return dateB.getTime() - dateA.getTime();
      })[0];
  }, [currentYearLogs]);

  const lastAfectosLog = useMemo(() => {
      return currentYearLogs.filter(l => l.type.includes('afectos')).sort((a, b) => {
          const dateA = a.sentAt?.toDate?.() || new Date(a.sentAt);
          const dateB = b.sentAt?.toDate?.() || new Date(b.sentAt);
          return dateB.getTime() - dateA.getTime();
      })[0];
  }, [currentYearLogs]);

  const funcionarioMap = useMemo(() => {
    return new Map(funcionarios.map(f => {
      const lastName = [f['APELLIDO P'], f['APELLIDO M']].filter(Boolean).join(' ');
      const firstName = f.NOMBRES || '';
      const fullName = [lastName, firstName].filter(Boolean).join(', ');
      return [f.id, { name: fullName, email: f.CORREO }];
    }));
  }, [funcionarios]);

  const getFuncionarioName = (id: string) => funcionarioMap.get(id)?.name || 'Desconocido';

  const { encargadosEmails, funcionariosAfectosEmails } = useMemo(() => {
    const encargados = (efemeride.encargados || [])
      .map(id => funcionarioMap.get(id))
      .filter((f): f is { name: string; email: string | undefined } => !!f);

    const funcionariosAfectos = (efemeride.funcionarios_afectos || [])
      .map(id => funcionarioMap.get(id))
      .filter((f): f is { name: string; email: string | undefined } => !!f);
      
    return { 
        encargadosEmails: [...new Map(encargados.map(item => [item.email, item])).values()].filter(f => f.email), 
        funcionariosAfectosEmails: [...new Map(funcionariosAfectos.map(item => [item.email, item])).values()].filter(f => f.email)
    };
  }, [efemeride, funcionarioMap]);
  
  const hasEmails = encargadosEmails.length > 0 || funcionariosAfectosEmails.length > 0;

  const getStatusText = (type: string) => {
      if (type.includes('0-days')) return 'Aviso del mismo día';
      if (type.includes('1-day')) return 'Aviso de 1 día antes';
      if (type.includes('2-days')) return 'Aviso de 2 días antes';
      if (type.includes('manual')) return 'Aviso enviado manualmente';
      return 'Aviso enviado';
  };

  const formatLogDate = (timestamp: any) => {
      if (!timestamp) return '';
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
  };

  const handleResetNotification = async () => {
      if (!resetTarget) return;
      setIsResetting(true);
      try {
          const result = await clearEfemerideNotificationLogs(efemeride.id, resetTarget);
          if (result.error) throw new Error(result.error);
          toast({
              title: "Notificación Reiniciada",
              description: `Se han eliminado los registros de envío para los ${resetTarget === 'encargados' ? 'encargados' : 'funcionarios'}.`,
          });
          setResetTarget(null);
      } catch (error: any) {
          toast({ variant: "destructive", title: "Error", description: error.message });
      } finally {
          setIsResetting(false);
      }
  };

  const handleManualSend = async (target: 'encargados' | 'afectos') => {
      setIsSendingManual(target);
      try {
          const result = await manualSendEfemerideNotification(efemeride.id, target);
          if (result.error) throw new Error(result.error);
          toast({
              title: "Envío Manual Exitoso",
              description: `Se han enviado ${result.count} correos a los ${target === 'encargados' ? 'encargados' : 'funcionarios'}.`,
          });
      } catch (error: any) {
          toast({ variant: "destructive", title: "Error en Envío Manual", description: error.message });
      } finally {
          setIsSendingManual(null);
      }
  };

  return (
    <>
      <Card className="flex flex-col justify-between animate-in fade-in-50 relative overflow-hidden group border-slate-200">
        <div className="absolute top-3 right-3 flex gap-1.5">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "p-1.5 rounded-full border transition-all duration-300",
                            notifiedEncargados 
                                ? "bg-green-100 border-green-200 text-green-600 opacity-100 shadow-sm" 
                                : "bg-slate-50 border-slate-100 text-slate-300 opacity-40"
                        )}>
                            <UserCheck className="h-3.5 w-3.5" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p className="text-xs font-bold">Encargados</p>
                        <p className="text-[10px]">
                            {notifiedEncargados && lastEncargadosLog
                                ? `${getStatusText(lastEncargadosLog.type)} enviado el ${formatLogDate(lastEncargadosLog.sentAt)}.` 
                                : "No se han enviado avisos a los responsables aún."}
                        </p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "p-1.5 rounded-full border transition-all duration-300",
                            notifiedAfectos 
                                ? "bg-blue-100 border-blue-200 text-blue-600 opacity-100 shadow-sm" 
                                : "bg-slate-50 border-slate-100 text-slate-300 opacity-40"
                        )}>
                            <Users className="h-3.5 w-3.5" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p className="text-xs font-bold">Funcionarios</p>
                        <p className="text-[10px]">
                            {notifiedAfectos && lastAfectosLog
                                ? `Aviso enviado el ${formatLogDate(lastAfectosLog.sentAt)}.` 
                                : "Los funcionarios aún no han recibido el aviso del día."}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        <CardHeader className="pt-8 pb-4">
          <CardTitle className="font-headline text-lg group-hover:text-primary transition-colors pr-16">{efemeride.nombre}</CardTitle>
          <div className="text-sm font-bold text-primary/80 uppercase tracking-tighter mt-1">{efemeride.dia} de {efemeride.mes}</div>
        </CardHeader>

        <CardContent className="text-sm space-y-4 flex-grow">
          <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <UserCheck className="h-3 w-3 text-green-600"/> Responsables
              </p>
              <div className="flex flex-wrap gap-1.5">
                  {efemeride.encargados.length > 0 ? efemeride.encargados.map(id => (
                    <Badge key={id} variant="outline" className="text-[10px] font-medium bg-green-50/50 border-green-100 text-green-800 py-0 px-2 h-5">
                        {getFuncionarioName(id)}
                    </Badge>
                  )) : <p className="text-xs text-muted-foreground italic">Sin asignar</p>}
              </div>
          </div>
           <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-3 w-3 text-blue-600"/> Homenajeados
              </p>
              <div className="flex flex-wrap gap-1.5">
                  {efemeride.funcionarios_afectos.length > 0 ? efemeride.funcionarios_afectos.map(id => (
                    <Badge key={id} variant="outline" className="text-[10px] font-medium bg-blue-50/50 border-blue-100 text-blue-800 py-0 px-2 h-5">
                        {getFuncionarioName(id)}
                    </Badge>
                  )) : <p className="text-xs text-muted-foreground italic">Sin especificar</p>}
              </div>
          </div>
        </CardContent>

        <CardFooter className="p-3 border-t bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-1">
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-white" onClick={() => setShowEmails(true)} disabled={!hasEmails}>
                              <Mail className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Ver correos</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className={cn("h-8 w-8", (notifiedEncargados || notifiedAfectos) ? "text-primary" : "text-slate-400")}>
                                      <BellRing className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent><p>Gestión de avisos</p></TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel className="flex items-center gap-2">
                          <BellRing className="h-4 w-4" /> Gestión de Notificaciones
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase">Encargados</div>
                      <DropdownMenuItem onClick={() => handleManualSend('encargados')} disabled={encargadosEmails.length === 0 || !!isSendingManual}>
                          {isSendingManual === 'encargados' ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />} Enviar Aviso Manual
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setResetTarget('encargados')}
                        disabled={!notifiedEncargados}
                        className="text-red-600 focus:text-red-600"
                      >
                          <RotateCcw className="h-3 w-3 mr-2" /> Borrar Registro (Reiniciar)
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase">Homenajeados</div>
                      <DropdownMenuItem onClick={() => handleManualSend('afectos')} disabled={funcionariosAfectosEmails.length === 0 || !!isSendingManual}>
                          {isSendingManual === 'afectos' ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />} Enviar Aviso Manual
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setResetTarget('afectos')}
                        disabled={!notifiedAfectos}
                        className="text-red-600 focus:text-red-600"
                      >
                          <RotateCcw className="h-3 w-3 mr-2" /> Borrar Registro (Reiniciar)
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-white" onClick={onEdit}>
                              <Edit className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Editar</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-red-50" onClick={onDelete}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Eliminar</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={showEmails} onOpenChange={setShowEmails}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Participantes a Notificar</DialogTitle>
                  <DialogDescription>Correos vinculados a "{efemeride.nombre}".</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-80 mt-4 border rounded-md p-4 bg-slate-50/50">
                  <div className="space-y-4">
                      {encargadosEmails.length > 0 && (
                          <div>
                              <h3 className="font-bold text-[10px] uppercase text-green-700 mb-2">Encargados</h3>
                              <ul className="space-y-1.5">
                                  {encargadosEmails.map((p) => (
                                      <li key={p.email} className="text-xs p-2 bg-white rounded border border-green-100 flex flex-col">
                                          <span className="font-semibold">{p.name}</span>
                                          <span className="text-muted-foreground">{p.email}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}
                      {funcionariosAfectosEmails.length > 0 && (
                          <div>
                              <h3 className="font-bold text-[10px] uppercase text-blue-700 mb-2 mt-4">Homenajeados</h3>
                              <ul className="space-y-1.5">
                                  {funcionariosAfectosEmails.map((p) => (
                                      <li key={p.email} className="text-xs p-2 bg-white rounded border border-blue-100 flex flex-col">
                                          <span className="font-semibold">{p.name}</span>
                                          <span className="text-muted-foreground">{p.email}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>

      <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-primary" /> ¿Reiniciar registro de aviso?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                      Esto permitirá que el sistema envíe el correo de recordatorio nuevamente hoy para los <strong>{resetTarget === 'encargados' ? 'encargados' : 'funcionarios'}</strong>.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetNotification} 
                    className="bg-primary text-white"
                    disabled={isResetting}
                  >
                      {isResetting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirmar Reinicio"}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}