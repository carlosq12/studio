'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Cake, Mail, MailCheck, MailQuestion } from 'lucide-react';
import type { Birthday } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface BirthdayCardProps {
  birthday: Birthday;
  onEdit: () => void;
  onDelete: () => void;
  onSendEmail: () => void;
}

const formatDate = (date: any) => {
    if (!date) return 'Fecha desconocida';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return format(d, "d 'de' MMMM", { locale: es });
}

const formatFullDate = (date: any): string => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
}

export function BirthdayCard({ birthday, onEdit, onDelete, onSendEmail }: BirthdayCardProps) {
  const fullName = birthday['nombre funcionario'] || 'Nombre Desconocido';
  const fallback = fullName
    .split(' ')
    .map((n) => n[0])
    .join('');

  const isNotified = !!birthday.fecha_aviso;

  return (
    <Card className="flex flex-col justify-between animate-in fade-in-50 group relative hover:shadow-lg transition-all border-none shadow-md">
      
      <div className="absolute top-3 right-3">
          <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <div className={cn(
                          "p-1.5 rounded-full border shadow-sm transition-all",
                          isNotified 
                              ? "bg-green-100 border-green-200 text-green-600 opacity-100 shadow-sm" 
                              : "bg-slate-50 border-slate-100 text-slate-300 opacity-40"
                      )}>
                          {isNotified ? (
                              <MailCheck className="h-3.5 w-3.5" />
                          ) : (
                              <MailQuestion className="h-3.5 w-3.5" />
                          )}
                      </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                      <p className="font-bold text-xs">Felicitación enviada</p>
                      <p className="text-[10px]">
                          {isNotified 
                              ? `Enviada el ${formatFullDate(birthday.fecha_aviso)}` 
                              : "No se ha enviado felicitación por correo este año."}
                      </p>
                  </TooltipContent>
              </Tooltip>
          </TooltipProvider>
      </div>

      <CardContent className="p-4 flex flex-col items-center text-center pt-8">
        <Avatar className="w-20 h-20 mb-4 border-4 border-primary/10">
          <AvatarImage src={birthday.avatar} alt={fullName} data-ai-hint="person portrait"/>
          <AvatarFallback className="text-xl bg-primary/5 text-primary">{fallback}</AvatarFallback>
        </Avatar>
        <p className="font-bold text-lg leading-tight text-foreground">{fullName}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 font-medium">
            <Cake className="h-4 w-4 text-primary"/>
            <span>{formatDate(birthday['fecha nacimiento'])}</span>
        </div>
        {birthday.correo && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[150px]" title={birthday.correo}>
                {birthday.correo}
              </span>
            </div>
          )}
      </CardContent>
      <CardHeader className="p-2 border-t flex-row items-center justify-center gap-1 bg-slate-50/50 rounded-b-lg">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white" onClick={onEdit}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Editar</p></TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white text-primary" onClick={onSendEmail} disabled={!birthday.correo}>
                        <Mail className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Enviar felicitación</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Eliminar</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </CardHeader>
    </Card>
  );
}
