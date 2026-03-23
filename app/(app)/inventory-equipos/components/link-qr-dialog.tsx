'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Link2, Loader2, QrCode } from 'lucide-react';
import { ScanQrDialog } from '../../inventory/components/scan-qr-dialog';
import { linkQrToEquipo } from '../actions';
import type { InventarioEquipo } from '@/lib/types';

interface LinkQrDialogProps {
  equipo: InventarioEquipo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkQrDialog({ equipo, open, onOpenChange }: LinkQrDialogProps) {
  const [isLinking, setIsLinking] = useState(false);
  const { toast } = useToast();

  const handleQrLinked = async (scannedCode: string) => {
    if (!scannedCode) return;
    
    setIsLinking(true);
    try {
      const result = await linkQrToEquipo(equipo.id, scannedCode);
      if (result.error) throw new Error(result.error);
      
      toast({
        title: '¡Placa Vinculada!',
        description: `El código "${scannedCode}" se ha asociado correctamente a este equipo.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al vincular',
        description: error.message || 'No se pudo vincular el código.',
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Placa Física</DialogTitle>
          <DialogDescription>
            Escanea el código QR de la placa oficial para asociarla a: 
            <span className="font-bold block mt-1 text-primary">
                {equipo['nombre equipo']}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 flex flex-col items-center justify-center gap-6">
            <div className="bg-primary/10 p-6 rounded-full">
                <Link2 className="h-12 w-12 text-primary" />
            </div>
            
            {isLinking ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p>Guardando código escaneado...</p>
                </div>
            ) : (
                <ScanQrDialog onQrCodeDetected={handleQrLinked} />
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLinking}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
