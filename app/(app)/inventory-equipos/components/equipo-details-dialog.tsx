
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { InventarioEquipo } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import * as React from 'react';
import { 
    Briefcase, 
    Calendar, 
    Hash, 
    Key,
    MapPin,
    User,
    HardDrive,
    Wifi,
    Info,
    Smartphone,
    Copy,
    Check,
    Globe,
    Mail,
    Tag
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface EquipoDetailsDialogProps {
  equipo: InventarioEquipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ icon, label, value, children }: { icon: React.ElementType, label: string; value?: string | null, children?: React.ReactNode }) => {
    const { toast } = useToast();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        if (value) {
            navigator.clipboard.writeText(value);
            setCopied(true);
            toast({
                title: '¡Copiado!',
                description: `${label} copiado al portapapeles.`,
                duration: 2000,
            });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex items-start gap-3 group">
            <div className="bg-primary/5 text-primary p-2 rounded-xl mt-0.5">
                {React.createElement(icon, { className: 'h-4 w-4' })}
            </div>
            <div className="space-y-0.5 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
                <div className="flex items-center gap-2">
                    {value ? (
                       <p className="text-sm font-semibold text-foreground">{value}</p>
                    ) : (
                       <p className="text-sm text-muted-foreground italic">No especificado</p>
                    )}
                    {children}
                    {value && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

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

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  'activo': 'default',
  'en reparación': 'secondary',
  'fuera de servicio': 'destructive',
};

export function EquipoDetailsDialog({ equipo, open, onOpenChange }: EquipoDetailsDialogProps) {
  if (!equipo) return null;

  const equipoName = equipo['nombre equipo'];
  const avatarFallback = (equipoName ? equipoName.split(' ').map(n => n[0]).join('') : '?').toUpperCase();
  const avatarUrl = `https://avatar.vercel.sh/${equipo.serial}.png`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-8 text-center flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white">
                <HardDrive className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-1">
                <DialogTitle className="text-2xl font-black font-headline text-foreground">{equipoName}</DialogTitle>
                <DialogDescription className="text-primary/70 font-medium">
                    Ficha Técnica del Equipamiento
                </DialogDescription>
            </div>
        </div>
        
        <ScrollArea className="max-h-[65vh]">
            <div className="p-6 space-y-6 bg-slate-50/50">
                <Section title="Información Principal" icon={HardDrive}>
                    <DetailItem icon={Tag} label="Número Interno" value={equipo.numero_interno} />
                    <DetailItem icon={Briefcase} label="Tipo de Arriendo" value={equipo.tipo_arriendo} />
                    <DetailItem icon={Smartphone} label="Tipo de Equipo" value={equipo['tipo de equipo']} />
                    <DetailItem icon={Info} label="Modelo" value={equipo.modelo} />
                    <DetailItem icon={Hash} label="Número de Serie" value={equipo.serial} />
                     <DetailItem icon={Info} label="Estado">
                        {equipo.estado ? <Badge variant={statusVariantMap[(equipo.estado || '').toLowerCase()] || 'outline'}>{equipo.estado}</Badge> : 'N/A'}
                     </DetailItem>
                    <div className="sm:col-span-2">
                        <DetailItem icon={Info} label="Descripción" value={equipo.descripcion} />
                    </div>
                    <div className="sm:col-span-2">
                        <DetailItem icon={Mail} label="Correo Relacionado" value={equipo['correo relacionado']} />
                    </div>
                </Section>
                
                <Section title="Detalles de Red y Asignación" icon={User}>
                    <DetailItem icon={Wifi} label="Dirección IP" value={equipo['ip equipo']} />
                    <DetailItem icon={Wifi} label="DNS 1" value={equipo.dns1} />
                    <DetailItem icon={Wifi} label="DNS 2" value={equipo.dns2} />
                    <DetailItem icon={Globe} label="Puerta de enlace IPv4" value={equipo['puerta de enlace ipv4']} />
                    <DetailItem icon={Globe} label="Máscara de subred IPv4" value={equipo['mascara ipv4']} />
                    <DetailItem icon={User} label="Nombre del Encargado" value={equipo['personal a cargo']} />
                    <DetailItem icon={User} label="Usuario del Encargado" value={equipo['usuario del encargado']} />
                    <DetailItem icon={MapPin} label="Ubicación" value={equipo.ubicacion} />
                    <DetailItem icon={Key} label="Licencia Office" value={equipo['licencia office']} />
                </Section>

                <Section title="Historial" icon={Calendar}>
                    <DetailItem label="Fecha de Ingreso" icon={Calendar} value={formatDate(equipo['fecha de ingreso'])} />
                </Section>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
