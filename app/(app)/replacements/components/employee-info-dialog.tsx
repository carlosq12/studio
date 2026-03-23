'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Briefcase, Hash, Mail, Phone, Building } from 'lucide-react';
import type { Employee, IngresoFuncionario } from '@/lib/types';
import * as React from 'react';

type Person = Partial<Employee & IngresoFuncionario>;

interface EmployeeInfoDialogProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ElementType, label: string; value?: string | null }) => {
  return (
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
};


export function EmployeeInfoDialog({ person, open, onOpenChange }: EmployeeInfoDialogProps) {
  if (!person) return null;

  const lastName = person['APELLIDO PATERNO'] || person['APELLIDO P'] || '';
  const maternalLastName = person['APELLIDO MATERNO'] || person['APELLIDO M'] || '';
  const firstName = person['NOMBRE FUNCIONARIO'] || person.NOMBRES || '';

  const fullLastName = [lastName, maternalLastName].filter(Boolean).join(' ');
  const fullName = [fullLastName, firstName].filter(Boolean).join(', ');
    
  const avatarFallback = (fullName.split(' ').map(n => n[0]).join('') || '?').toUpperCase();
  const rut = person.RUT;
  const avatarUrl = rut ? `https://avatar.vercel.sh/${rut}.png` : `https://avatar.vercel.sh/${fullName}.png`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
            <Avatar className="w-24 h-24 mb-4 border-4 border-primary/20">
                <AvatarImage src={avatarUrl} alt={fullName} data-ai-hint="person portrait"/>
                <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
            </Avatar>
            <DialogTitle className="text-2xl font-headline">{fullName}</DialogTitle>
            <DialogDescription>
                Información del Funcionario
            </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="grid grid-cols-1 gap-4 py-4">
            <DetailItem icon={Hash} label="RUT" value={person.RUT} />
            <DetailItem icon={Briefcase} label="Cargo / Título" value={person.CARGO || person.TITULO} />
            <DetailItem icon={Building} label="Unidad o Servicio" value={person['UNIDAD O SERVICIO']} />
            <DetailItem icon={Mail} label="Correo Electrónico" value={person.CORREO} />
            <DetailItem icon={Phone} label="Teléfono" value={person.TELEFONO} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
