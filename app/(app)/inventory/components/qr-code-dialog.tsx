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
import QRCode from 'qrcode.react';
import { useRef } from 'react';
import { Printer, Eye } from 'lucide-react';

interface QRCodeDialogProps {
  qrData: { id: string, name: string, serial?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNewItem?: boolean;
}

export function QRCodeDialog({ qrData, open, onOpenChange, isNewItem = false }: QRCodeDialogProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!qrData) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Etiqueta - ${qrData.name}</title>
                    <style>
                        @page { size: 50mm 30mm; margin: 0; }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            font-family: sans-serif; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            height: 30mm; 
                            width: 50mm; 
                            background-color: white;
                        }
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
                            padding: 8px 16px;
                            background: #008080;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 12px;
                            z-index: 1000;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        }
                        @media print {
                            .print-btn { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <button class="print-btn" onclick="window.print()">CONFIRMAR IMPRESIÓN</button>
                    <div class="label-page">
                        <div class="qr-container">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData.id}" />
                        </div>
                        <div class="info-container">
                            <div class="serial-num">${qrData.serial || 'S/N'}</div>
                            <div class="eq-name">${qrData.name || ''}</div>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    }
  };

  if (!qrData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <Eye className="h-5 w-5 text-primary" />
             Vista Previa de Etiqueta
          </DialogTitle>
          <DialogDescription>
             Así es como se verá la etiqueta en el papel de 5x3cm.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-10 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200">
          {/* Representación a escala de la etiqueta 50x30mm */}
          <div className="bg-white shadow-2xl flex items-center gap-3 p-[2mm] overflow-hidden" style={{ width: '50mm', height: '30mm', border: '1px solid #e2e8f0' }}>
            <div className="flex-shrink-0" style={{ width: '22mm', height: '22mm' }}>
                <QRCode
                    value={qrData.id}
                    size={150}
                    style={{ width: '100%', height: '100%' }}
                    renderAs="svg"
                />
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1">
                <p className="font-bold text-[10pt] vertical-align-middle leading-tight text-black line-clamp-1">{qrData.serial || 'S/N'}</p>
                <p className="text-[8pt] leading-tight text-gray-600 line-clamp-2 mt-1 uppercase">{qrData.name}</p>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Tamaño Real: 50mm x 30mm</p>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button onClick={handlePrint} className="gap-2">
                <Printer className="mr-2 h-4 w-4" />
                Continuar a Impresión
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
