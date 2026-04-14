'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Cake, Mail, MailCheck, MailQuestion } from 'lucide-react';
import type { IngresoFuncionario } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FuncionarioCardProps {
  funcionario: IngresoFuncionario;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddBirthday: () => void;
  onSendEmail: () => void;
}

const formatFullDate = (date: any): string => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
}

export function FuncionarioCard({ funcionario, onViewDetails, onEdit, onDelete, onAddBirthday, onSendEmail }: FuncionarioCardProps) {
  const lastName = [funcionario['APELLIDO P'], funcionario['APELLIDO M']].filter(Boolean).join(' ');
  const firstName = funcionario.NOMBRES || '';
  const fullName = [lastName, firstName].filter(Boolean).join(', ');
  const fallback = (funcionario['APELLIDO P']?.[0] || '') + (funcionario['APELLIDO M']?.[0] || '');
  
  const isNotified = !!funcionario.fecha_aviso;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="flex flex-col justify-between animate-in fade-in-50 group relative hover:shadow-lg transition-all duration-300 border-none shadow-md h-full">
      <CardContent className="p-4 flex flex-col items-center text-center pt-8">
        
        <div className="absolute top-3 right-3">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "p-1.5 rounded-full shadow-sm border transition-all duration-300",
                            isNotified 
                                ? "bg-green-100 border-green-200 text-green-600 opacity-100 shadow-sm" 
                                : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                        )}>
                            {isNotified ? (
                                <MailCheck className="h-4 w-4" />
                            ) : (
                                <MailQuestion className="h-4 w-4" />
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p className="font-semibold text-xs text-foreground">
                            {isNotified 
                                ? `Información enviada el ${formatFullDate(funcionario.fecha_aviso)}` 
                                : "Información aún no enviada"}
                        </p>
                    </TooltipContent>
                </Tooltip>
        </div>

        <Avatar className="w-24 h-24 mb-4 border-4 border-primary/10 group-hover:border-primary/30 transition-all">
          <AvatarImage src={`https://avatar.vercel.sh/${funcionario.RUT}.png`} alt={fullName} data-ai-hint="person portrait"/>
          <AvatarFallback className="text-xl bg-primary/5 text-primary">{fallback}</AvatarFallback>
        </Avatar>
        <p className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">{fullName}</p>
        <p className="text-sm text-muted-foreground mb-3 font-medium">{funcionario.CARGO || 'Cargo no especificado'}</p>
        <Badge variant="secondary" className="font-mono text-[10px] px-3">{funcionario.RUT}</Badge>
      </CardContent>
      <CardHeader className="p-3 border-t bg-primary flex-row items-center justify-center gap-2 rounded-b-lg">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20" onClick={onViewDetails}>
                        <Eye className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-foreground">Ver Detalles</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20" onClick={onEdit}>
                        <Edit className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-foreground">Editar</p></TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20" onClick={onAddBirthday}>
                        <Cake className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-foreground">Añadir a Cumpleaños</p></TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20" onClick={onSendEmail}>
                        <Mail className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-foreground">Enviar Información</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-red-500/50" onClick={onDelete}>
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-foreground">Eliminar</p></TooltipContent>
            </Tooltip>
      </CardHeader>
    </Card>
    </TooltipProvider>
  );
}
