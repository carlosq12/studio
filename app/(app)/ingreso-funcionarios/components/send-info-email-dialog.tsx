
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, X, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { IngresoFuncionario } from '@/lib/types';
import { sendFuncionarioInfoEmail, addNotificationRecipient, deleteNotificationRecipient } from '../actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const formSchema = z.object({
  emails: z.array(z.string().email()).min(1, "Se requiere al menos un correo electrónico.")
});

type EmailFormValues = z.infer<typeof formSchema>;

const emailEntrySchema = z.string().email({ message: 'La dirección de correo no es válida.' });

interface SendInfoEmailDialogProps {
    funcionario: IngresoFuncionario | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface NotificationRecipient {
  id: string;
  email: string;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="text-sm">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="font-semibold">{value || 'N/A'}</p>
    </div>
  );

export function SendInfoEmailDialog({ funcionario, open, onOpenChange }: SendInfoEmailDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const { toast } = useToast();
  const [currentEmail, setCurrentEmail] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  
  const firestore = useFirestore();
  const recipientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'notification_recipients');
  }, [firestore]);
  const { data: recipients, loading: loadingRecipients } = useCollection<NotificationRecipient>(recipientsQuery);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        emails: [],
    }
  });

  const emails = form.watch('emails');

  useEffect(() => {
    if (open) {
      const recipientEmails = recipients?.map(r => r.email) || [];
      const initialEmails = [...new Set([...recipientEmails].filter(Boolean))] as string[];
      form.reset({ emails: initialEmails });
      setCurrentEmail('');
      setInputError(null);
    }
  }, [open, recipients, form]);

  async function onSubmit(data: EmailFormValues) {
    if (!funcionario) return;
    setIsSubmitting(true);
    try {
      const serializableFuncionario: { [key: string]: any } = { ...funcionario };
      for (const key in serializableFuncionario) {
        if (serializableFuncionario[key] && typeof (serializableFuncionario[key] as any).toDate === 'function') {
            serializableFuncionario[key] = (serializableFuncionario[key] as any).toDate().toISOString();
        }
      }
      delete serializableFuncionario.id;

      const result = await sendFuncionarioInfoEmail(serializableFuncionario as IngresoFuncionario, data.emails);
      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Información Enviada!',
        description: `Los datos de ${funcionario.NOMBRES} han sido enviados a ${data.emails.join(', ')}.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo enviar el correo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleAddEmail = async () => {
    const result = emailEntrySchema.safeParse(currentEmail);
    if (!result.success) {
      setInputError(result.error.flatten().formErrors[0]);
      return;
    }

    if (recipients?.some(r => r.email === currentEmail)) {
        setInputError('El correo ya existe en la lista.');
        return;
    }

    setIsManaging(true);
    try {
        const addResult = await addNotificationRecipient(currentEmail);
        if (addResult?.error) {
            throw new Error(addResult.error);
        }
        toast({
            title: 'Destinatario añadido',
            description: `${currentEmail} ha sido añadido a la lista permanente.`
        });
        setCurrentEmail('');
        setInputError(null);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'No se pudo añadir el correo.',
        });
    } finally {
        setIsManaging(false);
    }
  };

  const handleRemoveEmail = async (recipient: NotificationRecipient) => {
    setIsManaging(true);
    try {
        const result = await deleteNotificationRecipient(recipient.id);
        if (result.error) {
            throw new Error(result.error);
        }
        toast({
            title: 'Destinatario eliminado',
            description: `${recipient.email} ha sido eliminado de la lista permanente.`
        });
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'No se pudo eliminar el correo.',
        });
    } finally {
        setIsManaging(false);
    }
  };

  if (!funcionario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Información del Funcionario</DialogTitle>
          <DialogDescription>
            Administra la lista de correos y confirma la información a enviar. Los cambios en la lista son permanentes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <FormLabel>Enviar a</FormLabel>
                <div className="flex items-center gap-2">
                <Input
                    placeholder="Añadir nuevo correo a la lista"
                    value={currentEmail}
                    onChange={(e) => {
                    setCurrentEmail(e.target.value)
                    if (inputError) setInputError(null)
                    }}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmail();
                    }
                    }}
                    disabled={isManaging || loadingRecipients}
                />
                <Button type="button" size="icon" onClick={handleAddEmail} disabled={isManaging || loadingRecipients}>
                    {isManaging ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                    <span className="sr-only">Añadir Correo</span>
                </Button>
                </div>
                {inputError && <p className="text-sm font-medium text-destructive">{inputError}</p>}
                
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto rounded-md border p-2">
                    {loadingRecipients ? <div className="text-center text-sm text-muted-foreground py-2">Cargando destinatarios...</div> : 
                    recipients && recipients.length > 0 ? (
                        recipients.map((recipient: NotificationRecipient) => (
                            <div key={recipient.id} className="flex items-center justify-between p-2 bg-secondary rounded-md text-sm">
                                <span className="truncate">{recipient.email}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleRemoveEmail(recipient)}
                                    disabled={isManaging}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-center text-muted-foreground py-2">No hay correos guardados.</p>
                    )}
                </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Información a enviar:</p>
              <ScrollArea className="h-48 border rounded-md p-4 bg-muted/50">
                  <div className="space-y-3">
                      <DetailItem label="Nombres" value={funcionario.NOMBRES} />
                      <DetailItem label="Apellido Paterno" value={funcionario['APELLIDO P']} />
                      <DetailItem label="Apellido Materno" value={funcionario['APELLIDO M']} />
                      <DetailItem label="RUT" value={funcionario.RUT} />
                      <DetailItem label="Teléfono" value={funcionario.TELEFONO} />
                      <DetailItem label="Correo" value={funcionario.CORREO} />
                      <DetailItem label="Banco" value={funcionario.BANCO} />
                      <DetailItem label="Tipo de Cuenta" value={funcionario.TIPO_DE_CUENTA} />
                      <DetailItem label="Número de Cuenta" value={funcionario.N_CUENTA} />
                  </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || loadingRecipients}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Correo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
