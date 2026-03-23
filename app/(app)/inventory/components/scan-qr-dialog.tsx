'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ScanQrDialogProps {
  onQrCodeDetected: (id: string) => void;
}

export function ScanQrDialog({ onQrCodeDetected }: ScanQrDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDetectorSupported, setIsDetectorSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      if (!('BarcodeDetector' in window)) {
        setIsDetectorSupported(false);
        return;
      }
      
      const startCameraAndDetect = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            
            const detect = async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const detectedValue = barcodes[0].rawValue;
                  onQrCodeDetected(detectedValue);
                  setOpen(false); // Close dialog on detection
                } else if (open) { // Continue detecting only if dialog is open
                  requestAnimationFrame(detect);
                }
              } else if (open) {
                requestAnimationFrame(detect);
              }
            };
            detect();
          }
        } catch (error) {
          console.error('Error al acceder a la cámara:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Acceso a la cámara denegado',
            description: 'Por favor, habilita los permisos de la cámara en tu navegador.',
          });
        }
      };
      
      startCameraAndDetect();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onQrCodeDetected, stopCamera, toast]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <QrCode className="mr-2 h-4 w-4" />
          Escanear QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear Código QR</DialogTitle>
          <DialogDescription>
            Apunta la cámara al código QR del artículo.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {!isDetectorSupported && (
                 <Alert variant="destructive">
                    <AlertTitle>Navegador no compatible</AlertTitle>
                    <AlertDescription>
                        Tu navegador no es compatible con la detección de códigos QR. Por favor, intenta con Chrome o Edge.
                    </AlertDescription>
                </Alert>
            )}
            {hasCameraPermission === false ? (
                 <Alert variant="destructive">
                    <AlertTitle>Acceso a la cámara denegado</AlertTitle>
                    <AlertDescription>
                        Para usar esta función, necesitas conceder permiso para acceder a la cámara en la configuración de tu navegador.
                    </AlertDescription>
                </Alert>
            ) : isDetectorSupported && (
                <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <div className="absolute inset-0 border-8 border-white/50 rounded-md animate-pulse"></div>
                    <div className="absolute text-white bg-black/50 px-4 py-2 rounded-md">
                        Buscando código QR...
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
