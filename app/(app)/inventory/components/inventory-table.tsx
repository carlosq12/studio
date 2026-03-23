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
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpDown } from 'lucide-react';
import type { InventarioItem } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, Firestore, orderBy, Timestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteInventoryItem } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditInventoryItemDialog } from './edit-inventory-item-dialog';
import { Input } from '@/components/ui/input';
import { InventoryCard } from './inventory-card';
import { QRCodeDialog } from './qr-code-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

type SortOption = 'nombre_asc' | 'nombre_desc' | 'cantidad_asc' | 'cantidad_desc' | 'fecha_asc' | 'fecha_desc';

function useInventoryItems(db: Firestore | null) {
  const itemsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'inventario'));
  }, [db]);
  return useCollection<InventarioItem>(itemsQuery);
}


export default function InventoryTable() {
  const firestore = useFirestore();
  const { data: items, loading } = useInventoryItems(firestore);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventarioItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<InventarioItem | null>(null);
  const [itemToShowQr, setItemToShowQr] = useState<InventarioItem | null>(null);
  
  const [filter, setFilter] = useState('');
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

  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];

    const filtered = items.filter(item => {
        const lowercasedFilter = filter.toLowerCase();
        return item.nombre.toLowerCase().includes(lowercasedFilter) ||
            item.descripcion?.toLowerCase().includes(lowercasedFilter) ||
            item.ubicacion?.toLowerCase().includes(lowercasedFilter)
    });

    return filtered.sort((a, b) => {
        switch (sortOption) {
            case 'nombre_asc':
                return a.nombre.localeCompare(b.nombre);
            case 'nombre_desc':
                return b.nombre.localeCompare(a.nombre);
            case 'cantidad_asc':
                return (a.cantidad || 0) - (b.cantidad || 0);
            case 'cantidad_desc':
                return (b.cantidad || 0) - (a.cantidad || 0);
            case 'fecha_asc':
                return (parseDate(a['fecha de ingreso'])?.getTime() || 0) - (parseDate(b['fecha de ingreso'])?.getTime() || 0);
            case 'fecha_desc':
                return (parseDate(b['fecha de ingreso'])?.getTime() || 0) - (parseDate(a['fecha de ingreso'])?.getTime() || 0);
            default:
                return 0;
        }
    });
  }, [items, filter, sortOption]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteInventoryItem(itemToDelete.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Item eliminado!',
        description: `El item "${itemToDelete.nombre}" ha sido eliminado.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo eliminar el item.',
      });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
      {[...Array(10)].map((_, i) => (
        <div className="flex flex-col space-y-3" key={i}>
            <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="p-4 border-b flex items-center gap-4">
         <Input 
            placeholder="Buscar por nombre, descripción o ubicación..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Ordenar por
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ordenar artículos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <DropdownMenuRadioItem value="nombre_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nombre_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="cantidad_asc">Cantidad (Menor a Mayor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="cantidad_desc">Cantidad (Mayor a Menor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="fecha_asc">Fecha (Más Antiguos)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="fecha_desc">Fecha (Más Nuevos)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
      <ScrollArea className="flex-1">
          {loading ? (
            renderSkeletons()
          ) : filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
              {filteredAndSortedItems.map((item) => (
                <InventoryCard 
                  key={item.id} 
                  item={item}
                  onEdit={() => setItemToEdit(item)}
                  onDelete={() => setItemToDelete(item)}
                  onShowQr={() => setItemToShowQr(item)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
                <p className="text-lg font-medium">No se encontraron items</p>
                <p>Intenta ajustar el filtro o añade un nuevo item.</p>
            </div>
          )}
      </ScrollArea>
      
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el item <span className="font-semibold">{itemToDelete?.nombre}</span>.
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
      
      <EditInventoryItemDialog
        item={itemToEdit}
        open={!!itemToEdit}
        onOpenChange={(open) => !open && setItemToEdit(null)}
       />
       <QRCodeDialog
        qrData={itemToShowQr ? { id: itemToShowQr.id, name: itemToShowQr.nombre } : null}
        open={!!itemToShowQr}
        onOpenChange={(isOpen) => {
          if (!isOpen) setItemToShowQr(null);
        }}
      />
    </>
  );
}
