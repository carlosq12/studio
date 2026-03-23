'use client';

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
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpDown, Printer, X } from 'lucide-react';
import type { InventarioEquipo } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, Firestore, Timestamp } from 'firebase/firestore';
import React, { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteInventarioEquipo } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditEquipoDialog } from './edit-equipo-dialog';
import { Input } from '@/components/ui/input';
import { EquipoCard } from './equipo-card';
import { QRCodeDialog } from '../../inventory/components/qr-code-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EquipoDetailsDialog } from './equipo-details-dialog';
import { PrintLabelsPreviewDialog } from './print-labels-preview-dialog';


type SortOption = 'nombre_asc' | 'nombre_desc' | 'fecha_asc' | 'fecha_desc' | 'ip_asc' | 'ip_desc';

function useInventoryEquipos(db: Firestore | null) {
  const itemsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'inventario_equipos'));
  }, [db]);
  return useCollection<InventarioEquipo>(itemsQuery);
}

interface InventoryEquiposTableProps {
    onCopyTo: (equipo: InventarioEquipo) => void;
    showArchived?: boolean;
}

export default function InventoryEquiposTable({ onCopyTo, showArchived = false }: InventoryEquiposTableProps) {
  const firestore = useFirestore();
  const { data: equipos, loading } = useInventoryEquipos(firestore);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [equipoToDelete, setEquipoToDelete] = useState<InventarioEquipo | null>(null);
  const [equipoToEdit, setEquipoToEdit] = useState<InventarioEquipo | null>(null);
  const [equipoToShowQr, setEquipoToShowQr] = useState<InventarioEquipo | null>(null);
  const [equipoToView, setEquipoToView] = useState<InventarioEquipo | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  
  const [filter, setFilter] = useState('');
  const [arriendoFilter, setArriendoFilter] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>('nombre_asc');
  
  const { toast } = useToast();

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const uniqueArriendoTypes = useMemo(() => {
    if (!equipos) return [];
    const types = new Set<string>();
    equipos.forEach((e) => {
      if (e.tipo_arriendo) types.add(e.tipo_arriendo);
    });
    return Array.from(types).sort();
  }, [equipos]);

  const filteredAndSortedEquipos = useMemo(() => {
    if (!equipos) return [];
    
    const filtered = equipos.filter(equipo => {
        if (!showArchived && equipo.archivadorId) return false;
        if (showArchived && !equipo.archivadorId) return false;

        const lowercasedFilter = filter.toLowerCase();
        const matchesSearch = (equipo['nombre equipo'] || '').toLowerCase().includes(lowercasedFilter) ||
            (equipo.serial || '').toLowerCase().includes(lowercasedFilter) ||
            (equipo.ubicacion || '').toLowerCase().includes(lowercasedFilter) ||
            (equipo['personal a cargo'] || '').toLowerCase().includes(lowercasedFilter) ||
            (equipo['ip equipo'] || '').toLowerCase().includes(lowercasedFilter) ||
            (equipo.tipo_arriendo || '').toLowerCase().includes(lowercasedFilter);

        const matchesArriendo = arriendoFilter === 'all' || equipo.tipo_arriendo === arriendoFilter;

        return matchesSearch && matchesArriendo;
    });
    
    const extractIpLastOctet = (ip: string | undefined) => {
        if (!ip) return -1;
        const parts = ip.split('.');
        return parts.length === 4 ? parseInt(parts[3], 10) : -1;
    };

    return filtered.sort((a, b) => {
        switch (sortOption) {
            case 'nombre_asc':
                return (a['nombre equipo'] || '').localeCompare(b['nombre equipo'] || '');
            case 'nombre_desc':
                return (b['nombre equipo'] || '').localeCompare(a['nombre equipo'] || '');
            case 'fecha_asc':
                return (parseDate(a['fecha de ingreso'])?.getTime() || 0) - (parseDate(b['fecha de ingreso'])?.getTime() || 0);
            case 'fecha_desc':
                return (parseDate(b['fecha de ingreso'])?.getTime() || 0) - (parseDate(a['fecha de ingreso'])?.getTime() || 0);
            case 'ip_asc':
                return extractIpLastOctet(a['ip equipo']) - extractIpLastOctet(b['ip equipo']);
            case 'ip_desc':
                return extractIpLastOctet(b['ip equipo']) - extractIpLastOctet(a['ip equipo']);
            default:
                return 0;
        }
    });

  }, [equipos, filter, arriendoFilter, sortOption, showArchived]);

  const handleDelete = async () => {
    if (!equipoToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteInventarioEquipo(equipoToDelete.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Equipo eliminado!',
        description: `El equipo "${equipoToDelete['nombre equipo']}" ha sido eliminado.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo eliminar el equipo.',
      });
    } finally {
      setIsDeleting(false);
      setEquipoToDelete(null);
    }
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      {[...Array(8)].map((_, i) => (
        <div className="flex flex-col space-y-3" key={i}>
            <Skeleton className="h-[230px] w-full rounded-xl" />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="p-4 border-b flex flex-wrap items-center gap-4">
         <Input 
            placeholder="Buscar por nombre, serial, ubicación, IP o tipo de arriendo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <Select value={arriendoFilter} onValueChange={setArriendoFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo de Arriendo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {uniqueArriendoTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsPrintPreviewOpen(true)} disabled={loading || filteredAndSortedEquipos.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Etiquetas QR
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Ordenar por
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar Equipos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <DropdownMenuRadioItem value="nombre_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="nombre_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="fecha_asc">Fecha (Más Antiguos)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="fecha_desc">Fecha (Más Nuevos)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ip_asc">IP (Ascendente)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ip_desc">IP (Descendente)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
      <ScrollArea className="flex-1">
          {loading ? (
            renderSkeletons()
          ) : filteredAndSortedEquipos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
              {filteredAndSortedEquipos.map((equipo) => (
                <EquipoCard
                  key={equipo.id} 
                  equipo={equipo}
                  onView={() => setEquipoToView(equipo)}
                  onEdit={() => setEquipoToEdit(equipo)}
                  onDelete={() => setEquipoToDelete(equipo)}
                  onShowQr={() => setEquipoToShowQr(equipo)}
                  onCopy={() => onCopyTo(equipo)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
                <p className="text-lg font-medium">No se encontraron equipos</p>
                <p>{filter || arriendoFilter !== 'all' ? 'Intenta ajustar los filtros.' : 'No hay equipos registrados en esta sección.'}</p>
            </div>
          )}
      </ScrollArea>

      <AlertDialog open={!!equipoToDelete} onOpenChange={(open) => !open && setEquipoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el equipo <span className="font-semibold">{equipoToDelete?.['nombre equipo']}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
      <EditEquipoDialog
        equipo={equipoToEdit}
        open={!!equipoToEdit}
        onOpenChange={(open) => !open && setEquipoToEdit(null)}
       />
      <EquipoDetailsDialog
        equipo={equipoToView}
        open={!!equipoToView}
        onOpenChange={(open) => !open && setEquipoToView(null)}
      />
       <QRCodeDialog
        qrData={equipoToShowQr ? { 
            id: equipoToShowQr.id, 
            name: equipoToShowQr['nombre equipo'] || '',
            serial: equipoToShowQr.serial
        } : null}
        open={!!equipoToShowQr}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEquipoToShowQr(null);
        }}
      />
      <PrintLabelsPreviewDialog
        open={isPrintPreviewOpen}
        onOpenChange={setIsPrintPreviewOpen}
        equipos={filteredAndSortedEquipos}
      />
    </>
  );
}