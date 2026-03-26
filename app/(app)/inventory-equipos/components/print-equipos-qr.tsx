'use client';

import React from 'react';
import type { InventarioEquipo } from '@/lib/types';
import QRCode from 'qrcode.react';

interface PrintEquiposQRProps {
  equipos: InventarioEquipo[];
}

const QRImage = ({ value, size }: { value: string; size: number }) => {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current.querySelector('canvas');
      if (canvas) {
        setImageUrl(canvas.toDataURL('image/png'));
      }
    }
  }, [value, size]);

  return (
    <>
      <div style={{ display: 'none' }} ref={canvasRef}>
        <QRCode value={value} size={size} renderAs="canvas" />
      </div>
      {imageUrl && <img src={imageUrl} alt={`QR Code for ${value}`} style={{ height: 'auto', maxWidth: '100%', width: '100%', marginBottom: '10px' }} />}
    </>
  );
};


export const PrintEquiposQR = React.forwardRef<HTMLDivElement, PrintEquiposQRProps>(({ equipos }, ref) => {
  return (
    <div ref={ref}>
      <style>{`
        @media print {
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          .label-container {
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
          .qr-box {
            width: 22mm;
            height: 22mm;
            flex-shrink: 0;
          }
          .info-box {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
            flex-grow: 1;
          }
          .serial-text {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 1mm;
            word-break: break-all;
            line-height: 1.1;
            color: black;
          }
          .name-text {
            font-size: 8pt;
            color: #333;
            line-height: 1.1;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-all;
          }
        }
      `}</style>
      <div className="print-content">
        {equipos.map((equipo) => (
          <div key={equipo.id} className="label-container">
            <div className="qr-box">
                <QRImage value={equipo.id} size={150} />
            </div>
            <div className="info-box">
                <div className="serial-text">{equipo.serial || 'S/N'}</div>
                <div className="name-text">{equipo['nombre equipo']}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

PrintEquiposQR.displayName = 'PrintEquiposQR';
