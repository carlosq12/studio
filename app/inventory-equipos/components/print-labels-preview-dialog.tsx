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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Eye } from 'lucide-react';
import type { InventarioEquipo } from '@/lib/types';

interface PrintLabelsPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipos: InventarioEquipo[];
}

export function PrintLabelsPreviewDialog({ open, onOpenChange, equipos }: PrintLabelsPreviewDialogProps) {
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = equipos.map(equipo => `
        <div class="label-page">
            <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${equipo.id}" />
            </div>
            <div class="info-container">
                <div class="serial-num">${equipo.serial || 'S/N'}</div>
                <div class="eq-name">${equipo['nombre equipo'] || ''}</div>
            </div>
        </div>
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Etiquetas de Inventario</title>
                <style>
                    @page { size: 50mm 30mm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: sans-serif; background-color: white; }
                    .label-page {
                        width: 50mm;
                        height: 30mm;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: center;
                        padding: 2mm;
                        box-sizing: border-box;
                        gap: 3mm;
                        page-break-after: always;
                        overflow: hidden;
                    }
                    .qr-container {
                        width: 22mm;
                        height: 22mm;
                        flex-shrink: 0;
                    }
                    .qr-container img {
                        width: 100%;
                        height: 100%;
                    }
                    .info-container {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        min-width: 0;
                        flex-grow: 1;
                    }
                    .serial-num {
                        font-weight: bold;
                        font-size: 10pt;
                        margin-bottom: 1mm;
                        word-break: break-all;
                        line-height: 1.1;
                        color: black;
                    }
                    .eq-name {
                        font-size: 8pt;
                        color: #333;
                        line-height: 1.1;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        word-break: break-all;
                    }
                    .print-btn {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        padding: 10px 20px;
                        background: #008080;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        z-index: 1000;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    }
                    .print-btn:hover {
                        background: #006666;
                    }
                    @media print { 
                        .print-btn { display: none; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <button class="print-btn" onclick="window.print()">IMPRIMIR TODAS LAS ETIQUETAS</button>
                ${itemsHtml}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <Eye className="h-6 w-6 text-primary" />
            Vista Previa de Impresión Masiva
          </DialogTitle>
          <DialogDescription>
            Revisa las {equipos.length} etiquetas generadas. Se imprimirán en formato Zebra 5x3cm.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 border rounded-md p-8 bg-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
                {equipos.map(equipo => (
                    <div key={equipo.id} className="flex flex-col items-center">
                        <div className="bg-white shadow-lg flex items-center gap-3 p-[2mm] overflow-hidden border border-slate-200" style={{ width: '50mm', height: '30mm' }}>
                            <div className="flex-shrink-0" style={{ width: '22mm', height: '22mm' }}>
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${equipo.id}`} 
                                    alt="QR"
                                    className="w-full h-full"
                                />
                            </div>
                            <div className="flex flex-col justify-center min-w-0 flex-1">
                                <span className="font-bold text-[10pt] leading-tight text-black line-clamp-1">{equipo.serial || 'S/N'}</span>
                                <span className="text-[8pt] leading-tight text-gray-600 line-clamp-2 mt-1 uppercase">{equipo['nombre equipo']}</span>
                            </div>
                        </div>
                        <span className="mt-2 text-[9px] font-mono text-muted-foreground bg-white px-2 py-0.5 rounded-full border">ID: {equipo.id.substring(0,8)}...</span>
                    </div>
                ))}
            </div>
        </ScrollArea>

        <DialogFooter className="sm:justify-between items-center pt-4">
          <p className="text-xs text-muted-foreground italic font-medium">
            Total: {equipos.length} etiquetas listas.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
            </Button>
            <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90">
                <Printer className="h-4 w-4" />
                Confirmar e Imprimir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
