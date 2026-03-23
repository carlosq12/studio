'use client';

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { Replacement } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { 
    Users, 
    User, 
    Calendar, 
    FileText, 
    Building, 
    Briefcase, 
    Info, 
    Mail, 
    Bell, 
    Hash,
    Paperclip,
    FileCheck,
    UserCog
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReplacementDetailsDialogProps {
  replacement: Replacement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ElementType, label: string; value?: string | null }) => (
  <div className="flex items-start gap-3">
    <div className="bg-primary/10 text-primary p-1.5 rounded-full">
        {React.createElement(icon, { className: 'h-4 w-4' })}
    </div>
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value || 'N/A'}</p>
    </div>
  </div>
);

const Section = ({ title, icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="space-y-4 rounded-lg bg-secondary/5 p-4 border border-secondary/10">
        <h3 className="font-headline font-semibold text-base flex items-center gap-2 text-secondary">
            {React.createElement(icon, { className: 'h-5 w-5' })}
            {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            {children}
        </div>
    </div>
);

const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'PPP', { locale: es });
}

export function ReplacementDetailsDialog({ replacement, open, onOpenChange }: ReplacementDetailsDialogProps) {
  if (!replacement) return null;

  const estadoRNR = replacement.ESTADO_R_NR || (replacement as any)['ESTADO R/NR'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">Detalles de la Solicitud</DialogTitle>
          <DialogDescription>
            Información completa del reemplazo de {replacement['NOMBRE REEMPLAZADO']}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 py-4">
                <Section title="Participantes" icon={Users}>
                    <DetailItem icon={User} label="Funcionario Reemplazado" value={replacement['NOMBRE REEMPLAZADO']} />
                    <DetailItem icon={UserCog} label="Funcionario Reemplazante" value={replacement.NOMBRE} />
                    <DetailItem icon={Briefcase} label="Cargo" value={replacement.CARGO} />
                    <DetailItem icon={Building} label="Unidad o Servicio" value={replacement.UNIDAD} />
                </Section>
                
                <Section title="Periodo y Motivo" icon={Calendar}>
                    <DetailItem label="Fecha de Inicio" icon={Calendar} value={formatDate(replacement.DESDE)} />
                    <DetailItem label="Fecha de Término" icon={Calendar} value={formatDate(replacement.HASTA)} />
                    <div className="sm:col-span-2">
                        <DetailItem label="Motivo del Reemplazo" icon={Info} value={replacement.MOTIVO} />
                    </div>
                </Section>

                <Section title="Gestión Administrativa" icon={FileText}>
                    <div className="flex items-center gap-4">
                        <DetailItem label="Estado R/NR" icon={FileCheck} value={estadoRNR} />
                        {estadoRNR && <Badge>{estadoRNR}</Badge>}
                    </div>
                    <DetailItem label="Nº de Resolución" icon={Hash} value={replacement['NUMERO RES']} />
                    <DetailItem label="Fecha Documento" icon={Paperclip} value={formatDate(replacement['FECHA DE INGRESO DOC'])} />
                    <DetailItem label="Mes/Año" icon={Calendar} value={`${replacement.MES} ${replacement.AÑO}`} />
                </Section>

                 <Section title="Aviso y Contacto" icon={Bell}>
                    <DetailItem label="Jefe de Servicio" icon={User} value={replacement['JEFE SERVICIO']} />
                    <DetailItem label="Correo de Notificación" icon={Mail} value={replacement.CORREO} />
                    <DetailItem label="Fecha de Envío" icon={Calendar} value={formatDate(replacement['FECHA DEL AVISO'])} />
                </Section>

                <div className="space-y-4 px-2">
                     <DetailItem label="Funciones Específicas" icon={FileText} value={replacement.FUNCIONES} />
                     <DetailItem label="Observaciones Adicionales" icon={Info} value={replacement.OBSERVACION} />
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}