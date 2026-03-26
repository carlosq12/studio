'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, HardDrive, User, MapPin, Wifi, Wrench, XCircle, QrCode, Eye, Copy, Monitor, Printer as PrinterIcon, Server, Tv, Laptop, Router, Archive } from 'lucide-react';
import type { InventarioEquipo, Archivador } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import React, { useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveEquipo } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EquipoCardProps {
  equipo: InventarioEquipo;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShowQr: () => void;
  onCopy: () => void;
}

const getEquipoIcon = (tipo?: string): React.ElementType => {
    switch (tipo?.toUpperCase()) {
        case 'COMPUTADOR':
            return Monitor;
        case 'NOTEBOOK':
            return Laptop;
        case 'IMPRESORA':
            return PrinterIcon;
        case 'SERVIDOR':
            return Server;
        case 'TV BOX':
            return Tv;
        case 'CISCO':
            return Router;
        default:
            return HardDrive;
    }
}

export function EquipoCard({ equipo, onView, onEdit, onDelete, onShowQr, onCopy }: EquipoCardProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const archivesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'archivadores_inventario')) : null, [firestore]);
    const { data: archives } = useCollection<Archivador>(archivesQuery);

    const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'activo': 'default',
      'en reparación': 'secondary',
      'fuera de servicio': 'destructive',
    };
    
    const statusIconMap: Record<string, React.ElementType> = {
      'activo': HardDrive,
      'en reparación': Wrench,
      'fuera de servicio': XCircle,
    };
    
    const lowerCaseStatus = (equipo.estado || '').toLowerCase();
    const statusVariant = statusVariantMap[lowerCaseStatus] || 'outline';
    const StatusIcon = statusIconMap[lowerCaseStatus] || HardDrive;
    const EquipoIcon = getEquipoIcon(equipo['tipo de equipo']);

    const handleArchive = async (archiveId: string) => {
        try {
            const result = await archiveEquipo(equipo.id, archiveId);
            if (result.error) throw new Error(result.error);
            toast({
                title: '¡Equipo Archivado!',
                description: 'El equipo ha sido movido al archivador.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error al archivar',
                description: error.message || 'No se pudo archivar el equipo.',
            });
        }
    };

    const archiveName = useMemo(() => {
        if (!equipo.archivadorId || !archives) return null;
        return archives.find(a => a.id === equipo.archivadorId)?.name;
    }, [archives, equipo.archivadorId]);

  return (
    <Card className={cn("flex flex-col justify-between animate-in fade-in-50 h-full", !equipo.archivadorId ? "" : "border-indigo-200 shadow-indigo-100")}>
      <CardHeader className="p-0">
        <div className="relative w-full h-36 bg-muted/30 rounded-t-lg flex items-center justify-center overflow-hidden">
          <EquipoIcon className="w-16 h-16 text-muted-foreground/40" />
          
           <div className="absolute top-2 right-2 p-1.5 bg-sky-100/80 backdrop-blur-sm rounded-xl border border-sky-200 shadow-sm flex flex-col gap-1.5 items-end">
                <TooltipProvider>
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm rounded-md" onClick={onView}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Ver Detalles</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm rounded-md" onClick={onCopy}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Duplicar</p></TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm rounded-md">
                                            <Archive className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Archivar Equipo</p></TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Archivar en</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-72">
                                    {archives && archives.length > 0 ? (
                                        archives.map(archive => (
                                            <DropdownMenuItem key={archive.id} onClick={() => handleArchive(archive.id)}>
                                                {archive.name}
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <DropdownMenuItem disabled>No hay archivadores</DropdownMenuItem>
                                    )}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm rounded-md" onClick={onShowQr}>
                                    <QrCode className="h-4 w-4 text-sky-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Ver código QR</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm rounded-md" onClick={onEdit}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Editar Equipo</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-8 w-8 shadow-sm rounded-md" onClick={onDelete}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Eliminar Equipo</p></TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>
        </div>

         <div className="p-4 pb-0">
            <CardTitle className="text-lg font-bold font-headline leading-tight">{equipo['nombre equipo']}</CardTitle>
            <CardDescription className="text-xs flex items-center justify-between mt-1">
                <span className="truncate mr-2 font-mono">{equipo.serial || 'S/N'}</span>
                {archiveName && (
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0">
                        <Archive className="h-2.5 w-2.5 mr-1" /> {archiveName}
                    </Badge>
                )}
            </CardDescription>
         </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2 p-4 flex-grow">
        {equipo.descripcion && <p className="text-xs text-muted-foreground line-clamp-2 italic">{equipo.descripcion}</p>}
        <div className="flex flex-wrap gap-2 items-center">
            {equipo.estado && <Badge variant={statusVariant} className="flex items-center gap-1 w-fit text-[10px] px-2 py-0 h-5">
                <StatusIcon className="h-2.5 w-2.5" />
                {equipo.estado}
            </Badge>}
        </div>
        <div className="pt-2 space-y-1.5 border-t mt-2">
            {equipo['ip equipo'] && (
                <div className="flex items-center gap-2" title="IP Equipo">
                    <Wifi className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-xs">{equipo['ip equipo']}</span>
                </div>
            )}
            {equipo['personal a cargo'] && (
                <div className="flex items-center gap-2" title="Personal a Cargo">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs truncate font-medium">{equipo['personal a cargo']}</span>
                </div>
            )}
            {equipo.ubicacion && (
                <div className="flex items-center gap-2" title="Ubicación">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs truncate">{equipo.ubicacion}</span>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
