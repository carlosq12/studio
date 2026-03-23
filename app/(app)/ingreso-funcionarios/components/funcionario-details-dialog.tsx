'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { IngresoFuncionario } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import * as React from 'react';
import {
  User,
  Briefcase,
  Calendar,
  Hash,
  Mail,
  Phone,
  MapPin,
  HeartPulse,
  Shield,
  Landmark,
  Building,
  Home,
  Clock,
  Heart
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FuncionarioDetailsDialogProps {
  funcionario: IngresoFuncionario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ElementType, label: string; value?: string | null }) => (
  <div className="flex items-start gap-3">
    <div className="bg-primary/5 text-primary p-2 rounded-xl mt-0.5">
        {React.createElement(icon, { className: 'h-4 w-4' })}
    </div>
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || 'N/A'}</p>
    </div>
  </div>
);

const Section = ({ title, icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="font-headline font-bold text-sm flex items-center gap-2 text-primary uppercase tracking-tight">
            {React.createElement(icon, { className: 'h-4 w-4' })}
            {title}
        </h3>
        <Separator className="opacity-50" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
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


export function FuncionarioDetailsDialog({ funcionario, open, onOpenChange }: FuncionarioDetailsDialogProps) {
  if (!funcionario) return null;

  const lastName = [funcionario['APELLIDO P'], funcionario['APELLIDO M']].filter(Boolean).join(' ');
  const firstName = funcionario.NOMBRES || '';
  const fullName = [lastName, firstName].filter(Boolean).join(', ');
  const avatarFallback = (fullName.split(' ').map(n => n[0]).join('') || '?').toUpperCase();
  const rut = funcionario.RUT;
  const avatarUrl = rut ? `https://avatar.vercel.sh/${rut}.png` : `https://avatar.vercel.sh/${fullName}.png`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-8 text-center flex flex-col items-center gap-4">
            <Avatar className="w-28 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={avatarUrl} alt={fullName} data-ai-hint="person portrait"/>
                <AvatarFallback className="text-3xl font-black bg-white text-primary">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
                <DialogTitle className="text-2xl font-black font-headline text-foreground">{fullName}</DialogTitle>
                <DialogDescription className="text-primary/70 font-medium">
                    Expediente completo del funcionario
                </DialogDescription>
            </div>
        </div>
        
        <ScrollArea className="max-h-[65vh]">
            <div className="p-6 space-y-6 bg-slate-50/50">
                <Section title="Información Personal" icon={User}>
                    <DetailItem icon={Hash} label="RUT" value={funcionario.RUT} />
                    <DetailItem icon={Calendar} label="Fecha de Nacimiento" value={formatDate(funcionario.FECHA_DE_NACIMIENTO)} />
                    <DetailItem icon={Home} label="Lugar de Nacimiento" value={funcionario.LUGAR_NACIMIENTO} />
                    <DetailItem icon={Heart} label="Estado Civil" value={funcionario.ESTADO_CIVIL} />
                </Section>
                
                <Section title="Detalles del Contrato" icon={Briefcase}>
                    <DetailItem icon={Briefcase} label="Cargo" value={funcionario.CARGO} />
                    <DetailItem icon={Calendar} label="Fecha de Ingreso" value={formatDate(funcionario.FECHA_DE_INGRESO)} />
                     <DetailItem icon={User} label="Estado" value={funcionario.ESTADO} />
                    <DetailItem icon={Clock} label="Nº Reloj Control" value={funcionario.N_RELOJ_CONTROL} />
                </Section>

                <Section title="Información de Contacto" icon={Mail}>
                    <DetailItem icon={Mail} label="Correo Electrónico" value={funcionario.CORREO} />
                    <DetailItem icon={Phone} label="Teléfono" value={funcionario.TELEFONO} />
                     <div className="sm:col-span-2">
                        <DetailItem icon={MapPin} label="Dirección" value={funcionario.DIRECCION} />
                    </div>
                </Section>

                <Section title="Previsión y Banco" icon={Landmark}>
                    <DetailItem icon={Shield} label="AFP" value={funcionario.AFP} />
                    <DetailItem icon={HeartPulse} label="Sistema de Salud" value={funcionario.SALUD} />
                    <DetailItem icon={HeartPulse} label="Nombre ISAPRE" value={funcionario.NOMBRE_ISAPRE} />
                    <DetailItem icon={Landmark} label="Banco" value={funcionario.BANCO} />
                    <DetailItem icon={Briefcase} label="Tipo de Cuenta" value={funcionario.TIPO_DE_CUENTA} />
                    <DetailItem icon={Hash} label="Nº Cuenta" value={funcionario.N_CUENTA} />
                </Section>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
