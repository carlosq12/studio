'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CalendarDays, ArrowRight, User, Eye, Check, Clock, Archive, MessageSquare, CalendarClock, X, MailCheck, MailWarning } from 'lucide-react';
import type { Replacement, Archivador } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp, collection, query } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { updateReplacementStatus, archiveReplacement } from '../actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReplacementCardProps {
  replacement: Replacement;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  isMonthly?: boolean;
}

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : (typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp));
    return isNaN(date.getTime()) ? 'N/A' : format(date, "d 'de' MMMM yyyy", { locale: es });
}

const formatFullDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : (typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp));
    return isNaN(date.getTime()) ? 'N/A' : format(date, "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
}

export function ReplacementCard({ replacement, onView, onEdit, onDelete, onCopy, isMonthly }: ReplacementCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const archivesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'archivadores')) : null, [firestore]);
  const { data: archives } = useCollection<Archivador>(archivesQuery);

  const [statusToUpdate, setStatusToUpdate] = useState<'SI' | 'EN PROCESO' | 'NO' | null>(null);

  const archiveName = useMemo(() => {
    if (!replacement.archivadorId || !archives) return null;
    return archives.find(a => a.id === replacement.archivadorId)?.name;
  }, [archives, replacement.archivadorId]);

  const handleStatusUpdate = async () => {
    if (!statusToUpdate) return;
    try {
      const result = await updateReplacementStatus(replacement.id, statusToUpdate);
      if (result.error) throw new Error(result.error);
      toast({ title: '¡Estado actualizado!', description: `Estado cambiado a ${statusToUpdate}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setStatusToUpdate(null);
    }
  };

  const handleArchive = async (archiveId: string) => {
    try {
      const result = await archiveReplacement(replacement.id, archiveId);
      if (result.error) throw new Error(result.error);
      toast({ title: '¡Archivado!', description: 'Solicitud movida correctamente.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const estadoDisplay = (replacement.ESTADO_R_NR || (replacement as any)['ESTADO R/NR'] || '').toUpperCase();
  const isRejected = (replacement.ESTADO || '').toUpperCase() === 'RECHAZADO' || estadoDisplay === 'NO';
  const isResolved = estadoDisplay === 'SI';
  const isInProcess = estadoDisplay === 'EN PROCESO';
  const isNotified = !!replacement['FECHA DEL AVISO'];

  return (
    <>
    <TooltipProvider>
      <Card className={cn(
        "flex flex-col relative overflow-hidden transition-all duration-300 h-full border border-slate-200 bg-white shadow-sm hover:shadow-md group border-l-4",
        isRejected ? "border-l-red-500 bg-red-50/20" : 
        isResolved ? "border-l-emerald-500 bg-emerald-50/20" : 
        isInProcess ? "border-l-sky-500 bg-sky-50/20" : 
        "border-l-slate-300"
      )}>
        
        <div className="absolute top-3 right-3 z-10">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "p-1.5 rounded-full border transition-all duration-300 shadow-sm",
                        isNotified 
                            ? "bg-green-100 border-green-200 text-green-600 opacity-100 shadow-sm" 
                            : "bg-slate-50 border-slate-100 text-slate-300 opacity-60"
                    )}>
                        {isNotified ? (
                            <MailCheck className="h-3.5 w-3.5" />
                        ) : (
                            <MailWarning className="h-3.5 w-3.5" />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p className="text-xs font-bold text-foreground">Estado de Notificación</p>
                    <p className="text-[10px] text-foreground/80">
                        {isNotified 
                            ? `Aviso enviado el ${formatFullDate(replacement['FECHA DEL AVISO'])}` 
                            : "El Jefe de Servicio aún no ha sido notificado por correo."}
                    </p>
                </TooltipContent>
            </Tooltip>
        </div>

        <div className="flex flex-col h-full">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col gap-1 pr-8">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{replacement['NOMBRE REEMPLAZADO']}</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <ArrowRight className={cn("h-3 w-3 rotate-90", isRejected ? "text-red-500" : isResolved ? "text-emerald-500" : isInProcess ? "text-sky-500" : "text-primary")} />
                      <span className="font-bold text-sm truncate text-foreground">{replacement.NOMBRE}</span>
                  </div>
              </div>
              <CardTitle className="text-base mt-2 line-clamp-1 font-headline text-foreground">
                {replacement.MOTIVO || 'Sin Motivo'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-4 pt-0 text-xs flex-1">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{formatDate(replacement.DESDE)} - {formatDate(replacement.HASTA)}</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn(
                        "text-[10px] font-bold border-none",
                        isRejected ? "bg-red-100 text-red-700" : 
                        isResolved ? "bg-emerald-100 text-emerald-700" : 
                        isInProcess ? "bg-sky-100 text-sky-700" : 
                        "bg-slate-100 text-slate-700"
                    )}>
                        {estadoDisplay || 'PENDIENTE'}
                    </Badge>
                    
                    {replacement.OBSERVACION && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="relative cursor-help group/obs">
                                    <MessageSquare className="h-5 w-5 text-primary transition-transform group-hover/obs:scale-110" />
                                    <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse"></span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-primary text-white border-none shadow-lg">
                                <p className="text-xs font-medium p-1">{replacement.OBSERVACION}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {archiveName && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Archive className="h-4 w-4 text-muted-foreground/70" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p className="text-xs">Archivado en: {archiveName}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {isMonthly && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CalendarClock className="h-4 w-4 text-indigo-500" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p className="text-xs">Solicitud Mensual Recurrente</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </CardContent>

            <div className="p-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm border-t">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700" onClick={() => setStatusToUpdate('SI')} title="Marcar como Resuelto">
                    <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-sky-100 hover:text-sky-700" onClick={() => setStatusToUpdate('EN PROCESO')} title="Marcar como En Proceso">
                    <Clock className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-red-100 hover:text-red-700" onClick={() => setStatusToUpdate('NO')} title="Marcar como No Resuelto">
                    <X className="h-4 w-4" />
                </Button>
                <div className="mx-1 h-4 border-l border-slate-200" />
                
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-slate-100" onClick={onView} title="Ver Detalles">
                    <Eye className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-slate-100">
                            <Archive className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Archivar en</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-72">
                            {archives?.map(a => (
                                <DropdownMenuItem key={a.id} onClick={() => handleArchive(a.id)}>{a.name}</DropdownMenuItem>
                            ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-slate-100" onClick={onEdit} title="Editar">
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-red-50" onClick={onDelete} title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </Card>
    </TooltipProvider>

    <AlertDialog open={!!statusToUpdate} onOpenChange={(o) => !o && setStatusToUpdate(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Confirmar cambio de estado?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleStatusUpdate} className="bg-primary hover:bg-primary/90">Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
