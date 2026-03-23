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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, CalendarIcon, UploadCloud, Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { updateInventoryItem } from '../actions';
import type { InventarioItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const inventoryItemSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.'),
  descripcion: z.string().optional(),
  cantidad: z.coerce.number().min(0, 'La cantidad no puede ser negativa.'),
  stock: z.string().optional(),
  ubicacion: z.string().optional(),
  'fecha de ingreso': z.date().optional().nullable(),
  imagen: z.string().optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

interface EditInventoryItemDialogProps {
  item: InventarioItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


export function EditInventoryItemDialog({ item, open, onOpenChange }: EditInventoryItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
  });

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'string') return parseISO(date);
    return null;
  }

  useEffect(() => {
    if (item) {
      form.reset({
        ...item,
        cantidad: item.cantidad ?? 0,
        descripcion: item.descripcion || '',
        stock: item.stock || '',
        ubicacion: item.ubicacion || '',
        'fecha de ingreso': parseDate(item['fecha de ingreso']),
        imagen: item.imagen || '',
      });
      setImagePreview(item.imagen || null);
    }
  }, [item, form]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedDataUrl = await resizeImage(file, 800, 800, 0.7);
        setImagePreview(resizedDataUrl);
        form.setValue('imagen', resizedDataUrl);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error al procesar la imagen',
          description: 'No se pudo redimensionar la imagen. Inténtalo de nuevo.',
        });
      }
    }
  };

  async function onSubmit(data: InventoryItemFormValues) {
    if (!item) return;
    setIsSubmitting(true);
    try {
      const itemData = {
        ...data,
        id: item.id,
        'fecha de ingreso': data['fecha de ingreso']?.toISOString() || '',
      } as any;
      
      const result = await updateInventoryItem(itemData);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Item Actualizado!',
        description: `El item ${data.nombre} ha sido actualizado.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description:
          error.message || 'No se pudo actualizar el item. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const openCamera = async () => {
    setCapturedImage(null);
    setShowCameraDialog(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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
  }

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const maxWidth = 800;
      const maxHeight = 800;
      let { videoWidth: width, videoHeight: height } = video;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };
  
  const handleUseCapturedImage = () => {
    if (capturedImage) {
      setImagePreview(capturedImage);
      form.setValue('imagen', capturedImage);
      setShowCameraDialog(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            form.reset();
            setImagePreview(null);
        }
    }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Item de Inventario</DialogTitle>
          <DialogDescription>
            Modifica los detalles del item. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
             <ScrollArea className="h-96 pr-6">
              <div className="space-y-4 py-4">
                 <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Resma de papel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="cantidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 10 cajas" {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="ubicacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Bodega 2, Estante A" {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormItem>
                    <FormLabel>Imagen (Opcional)</FormLabel>
                    <div className="flex gap-2">
                        <div
                        className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors flex-grow"
                        onClick={() => fileInputRef.current?.click()}
                        >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {imagePreview ? (
                            <div className="relative w-full h-32">
                            <Image src={imagePreview} alt="Vista previa" layout="fill" objectFit="contain" className="rounded-md" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <UploadCloud className="h-8 w-8" />
                            <p className="text-sm">Subir una imagen</p>
                            </div>
                        )}
                        </div>
                        <Button type="button" variant="outline" size="icon" onClick={openCamera} className="h-auto px-4">
                            <Camera className="h-8 w-8" />
                        </Button>
                    </div>
                  <FormMessage />
                </FormItem>
                <FormField
                  control={form.control}
                  name="fecha de ingreso"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Ingreso</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog open={showCameraDialog} onOpenChange={(isOpen) => {
        if (!isOpen) stopCamera();
        setShowCameraDialog(isOpen);
    }}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Tomar una Foto</DialogTitle>
                <DialogDescription>Apunta con la cámara y captura una imagen del artículo.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {hasCameraPermission === false && (
                    <Alert variant="destructive">
                        <AlertTitle>Acceso a la cámara denegado</AlertTitle>
                        <AlertDescription>
                            Para usar esta función, necesitas conceder permiso para acceder a la cámara en la configuración de tu navegador.
                        </AlertDescription>
                    </Alert>
                )}
                {hasCameraPermission !== false && (
                    <>
                        <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden">
                           {capturedImage ? (
                                <Image src={capturedImage} alt="Foto capturada" layout="fill" objectFit="contain" />
                           ) : (
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                           )}
                        </div>
                         <canvas ref={canvasRef} className="hidden" />
                    </>
                )}
            </div>
            <DialogFooter>
                 {capturedImage ? (
                    <>
                        <Button variant="outline" onClick={() => { setCapturedImage(null); openCamera(); }}>Volver a Tomar</Button>
                        <Button onClick={handleUseCapturedImage}>Usar esta Foto</Button>
                    </>
                 ) : (
                    <Button onClick={handleCapture} disabled={!hasCameraPermission}>Capturar Foto</Button>
                 )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
