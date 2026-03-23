'use client';

import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Package, Layers, MapPin, QrCode } from 'lucide-react';
import type { InventarioItem } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';

interface InventoryCardProps {
  item: InventarioItem;
  onEdit: () => void;
  onDelete: () => void;
  onShowQr: () => void;
}

export function InventoryCard({ item, onEdit, onDelete, onShowQr }: InventoryCardProps) {
  return (
    <Card className="flex flex-col justify-between animate-in fade-in-50">
      <CardHeader className="p-0">
        <div className="relative w-full h-32">
          <Image
            src={item.imagen || 'https://placehold.co/600x400/EEE/31343C?text=Sin+Imagen'}
            alt={item.nombre}
            fill
            className="object-cover rounded-t-lg"
            data-ai-hint="office supplies"
          />
           <div className="absolute top-2 right-2 flex items-center gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={onShowQr}>
                                <QrCode className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Mostrar QR</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={onEdit}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Editar</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Eliminar</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
         <div className="p-4 pb-0">
            <CardTitle className="text-lg font-bold font-headline leading-tight">{item.nombre}</CardTitle>
         </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2 p-4">
         {item.descripcion && <p className="text-xs text-muted-foreground">{item.descripcion}</p>}
        <div className="flex items-center gap-2" title="Cantidad">
            <Package className="h-4 w-4 text-primary" />
            <span className="font-semibold">{item.cantidad}</span>
            <span className="text-muted-foreground">unidades</span>
        </div>
        {item.stock && (
            <div className="flex items-center gap-2" title="Stock">
                <Layers className="h-4 w-4 text-primary" />
                <span>{item.stock}</span>
            </div>
        )}
        {item.ubicacion && (
            <div className="flex items-center gap-2" title="Ubicación">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{item.ubicacion}</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
