'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { InventarioItem } from '@/lib/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface ManualStockDialogProps {
    onItemSelect: (itemId: string) => void;
}

export function ManualStockDialog({ onItemSelect }: ManualStockDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventario')) : null, [firestore]);
  const { data: items } = useCollection<InventarioItem>(itemsQuery);

  const handleSelect = (itemId: string) => {
    onItemSelect(itemId);
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Ajustar Stock
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Artículo</DialogTitle>
            <DialogDescription>
              Busca y selecciona un artículo para ajustar su stock.
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar artículo por nombre..." />
            <CommandList>
              <CommandEmpty>No se encontraron artículos.</CommandEmpty>
              <CommandGroup>
                {(items || []).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.nombre}
                    onSelect={() => handleSelect(item.id)}
                  >
                    {item.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
