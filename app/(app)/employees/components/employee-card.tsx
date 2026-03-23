'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmployeeCardProps {
  employee: Employee;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EmployeeCard({ employee, onViewDetails, onEdit, onDelete }: EmployeeCardProps) {
  const fullName = `${employee['NOMBRE FUNCIONARIO']} ${employee['APELLIDO PATERNO']}`;
  const fallback = (employee['NOMBRE FUNCIONARIO']?.[0] || '') + (employee['APELLIDO PATERNO']?.[0] || '');

  return (
    <Card className="flex flex-col justify-between animate-in fade-in-50">
      <CardContent className="p-4 flex flex-col items-center text-center">
        <Avatar className="w-20 h-20 mb-4 border-2 border-primary/20">
          <AvatarImage src={`https://avatar.vercel.sh/${employee.RUT}.png`} alt={fullName} data-ai-hint="person portrait"/>
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <p className="font-bold text-lg leading-tight">{fullName}</p>
        <p className="text-sm text-muted-foreground mb-2">{employee.TITULO || 'Cargo no especificado'}</p>
        <p className="text-xs font-mono bg-muted px-2 py-1 rounded">{employee.RUT}</p>
      </CardContent>
      <CardHeader className="p-2 border-t flex-row items-center justify-center gap-1">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onViewDetails}>
                        <Eye className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Ver Detalles</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onEdit}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Editar</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Eliminar</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </CardHeader>
    </Card>
  );
}
