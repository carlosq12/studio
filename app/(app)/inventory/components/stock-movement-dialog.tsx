'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { InventarioItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { updateItemQuantity } from '../actions';

interface StockMovementDialogProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDialog({ itemId, open, onOpenChange }: StockMovementDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState<'in' | 'out' | false>(false);

  const itemRef = useMemoFirebase(() => {
    if (!firestore || !itemId) return null;
    return doc(firestore, 'inventario', itemId);
  }, [firestore, itemId]);

  const { data: item, loading } = useDoc<InventarioItem>(itemRef);

  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setIsSubmitting(false);
    }
  }, [open]);
  
  const handleAction = async (movement: 'in' | 'out') => {
      if (!itemId) return;
      setIsSubmitting(movement);

      const quantityChange = movement === 'in' ? quantity : -quantity;

      try {
        const result = await updateItemQuantity(itemId, quantityChange);
        if (result.error) {
            throw new Error(result.error);
        }
        toast({
            title: `¡Movimiento exitoso!`,
            description: `${quantity} unidad(es) se han ${movement === 'in' ? 'ingresado' : 'retirado'} del stock.`,
        });
        onOpenChange(false);
      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Error en el movimiento',
              description: error.message || 'No se pudo actualizar el stock.'
          });
      } finally {
          setIsSubmitting(false);
      }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento de Stock</DialogTitle>
          <DialogDescription>
            Ingresa o retira unidades del artículo escaneado.
          </DialogDescription>
        </DialogHeader>
        {loading || !item ? (
          <div className="py-4 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-md bg-muted">
                <div className="relative w-20 h-20 flex-shrink-0">
                    <Image 
                        src={item.imagen || `https://placehold.co/100x100/EEE/31343C?text=${item.nombre.charAt(0)}`}
                        alt={item.nombre}
                        fill
                        className="rounded-md object-cover"
                    />
                </div>
                <div className="flex-grow">
                    <p className="font-bold text-lg">{item.nombre}</p>
                    <p className="text-sm text-muted-foreground">Stock actual: <span className="font-semibold text-foreground">{item.cantidad}</span></p>
                </div>
            </div>
             <div>
                <label htmlFor="quantity" className="text-sm font-medium">Cantidad</label>
                <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="mt-1"
                />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!isSubmitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => handleAction('out')} disabled={!!isSubmitting || loading}>
            {isSubmitting === 'out' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowDown className="mr-2 h-4 w-4" />}
            Retirar
          </Button>
          <Button onClick={() => handleAction('in')} disabled={!!isSubmitting || loading}>
            {isSubmitting === 'in' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowUp className="mr-2 h-4 w-4" />}
            Ingresar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
