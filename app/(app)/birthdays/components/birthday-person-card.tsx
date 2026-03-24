'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import type { Birthday } from '@/lib/types';
import { Mail, Gift, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { manualSendBirthdayEmail } from '../actions';
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

interface BirthdayPersonCardProps {
  person: Birthday;
  onEdit: () => void;
}

export function BirthdayPersonCard({ person, onEdit }: BirthdayPersonCardProps) {
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const fullName = person['nombre funcionario'] || 'Nombre Desconocido';
  const fallback = fullName
    .split(' ')
    .map((n) => n[0])
    .join('');

  const handleSendEmail = async () => {
    if (!person.correo) {
        toast({
            variant: "destructive",
            title: "Sin Correo",
            description: "Esta persona no tiene un correo electrónico registrado.",
        });
        return;
    }
    setIsSendingEmail(true);
    setShowSendConfirm(false);
    try {
      const result = await manualSendBirthdayEmail(
        person.id,
        fullName,
        person.correo,
      );

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "¡Correo enviado!",
        description: `Se ha enviado una felicitación a ${person.correo}.`,
      });

    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error al enviar correo",
        description: error.message || "No se pudo enviar la felicitación.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  }


  return (
    <>
    <Card className="bg-background/80 backdrop-blur-sm animate-in fade-in-50 slide-in-from-bottom-5">
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="w-16 h-16 border-2 border-primary/30 shadow-md">
          <AvatarImage
            src={person.avatar}
            alt={fullName}
            data-ai-hint="person portrait"
          />
          <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-bold text-lg font-headline">{fullName}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <span>{person.role || 'Sin rol especificado'}</span>
          </p>
          {person.correo && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <a href={`mailto:${person.correo}`} className="hover:underline">
                {person.correo}
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 self-start">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar Cumpleaños</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowSendConfirm(true)} disabled={isSendingEmail || !person.correo} className="h-8 w-8">
                  {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enviar felicitación</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Correo de Felicitación</AlertDialogTitle>
            <AlertDialogDescription>
                ¿Estás seguro de que quieres enviar una felicitación de cumpleaños a <span className="font-semibold">{person.correo}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSendingEmail}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Sí, enviar correo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
