
'use client';

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
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import type { Birthday } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteBirthday, manualSendBirthdayEmail } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { EditBirthdayDialog } from './edit-birthday-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getMonth } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BirthdayCard } from "./birthday-card";

function useBirthdays(db: any) {
  const birthdaysQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'cumpleaños'), orderBy('nombre funcionario', 'asc'));
  }, [db]);
  return useCollection<Birthday>(birthdaysQuery);
}

const meses = [
  { value: '0', label: 'Enero' }, { value: '1', label: 'Febrero' }, { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' }, { value: '4', label: 'Mayo' }, { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' }, { value: '10', label: 'Noviembre' }, { value: '11', label: 'Diciembre' }
];

export default function BirthdaysTable() {
  const firestore = useFirestore();
  const { data: birthdays, loading } = useBirthdays(firestore);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [birthdayToDelete, setBirthdayToDelete] = useState<Birthday | null>(null);
  const [birthdayToEdit, setBirthdayToEdit] = useState<Birthday | null>(null);
  const [birthdayToSendEmail, setBirthdayToSendEmail] = useState<Birthday | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);


  const [nameFilter, setNameFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const { toast } = useToast();

  const filteredBirthdays = useMemo(() => {
    if (!birthdays) return [];
    return birthdays.filter(birthday => {
      const nameMatch = !nameFilter || birthday['nombre funcionario']?.toLowerCase().includes(nameFilter.toLowerCase());
      
      let monthMatch = true;
      if (monthFilter && birthday['fecha nacimiento']) {
        const birthDate = birthday['fecha nacimiento'] instanceof Timestamp 
          ? birthday['fecha nacimiento'].toDate()
          : new Date(birthday['fecha nacimiento']);
        monthMatch = getMonth(birthDate).toString() === monthFilter;
      }
      
      return nameMatch && monthMatch;
    });
  }, [birthdays, nameFilter, monthFilter]);

  const clearFilters = () => {
    setNameFilter('');
    setMonthFilter('');
  };


  const handleDelete = async () => {
    if (!birthdayToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteBirthday(birthdayToDelete.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Cumpleaños eliminado!',
        description: `El cumpleaños de "${birthdayToDelete['nombre funcionario']}" ha sido eliminado.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: error.message || 'No se pudo eliminar el cumpleaños.',
      });
    } finally {
      setIsDeleting(false);
      setBirthdayToDelete(null);
    }
  };

  const handleSendEmail = async () => {
    if (!birthdayToSendEmail || !birthdayToSendEmail.correo) {
      toast({
            variant: "destructive",
            title: "Sin Correo",
            description: "Esta persona no tiene un correo electrónico registrado.",
        });
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const result = await manualSendBirthdayEmail(
        birthdayToSendEmail.id,
        birthdayToSendEmail['nombre funcionario'] || 'Colega',
        birthdayToSendEmail.correo,
      );

      if (result.error) throw new Error(result.error);
      
      toast({
        title: "¡Correo enviado!",
        description: `Se ha enviado una felicitación a ${birthdayToSendEmail.correo}.`,
      });

    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error al enviar correo",
        description: error.message || "No se pudo enviar la felicitación.",
      });
    } finally {
      setIsSendingEmail(false);
      setBirthdayToSendEmail(null);
    }
  }


  const renderSkeletons = () => (
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
      {[...Array(10)].map((_, i) => (
        <div className="flex flex-col space-y-3" key={i}>
            <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="p-4 border-b">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Input 
            placeholder="Filtrar por nombre..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Mes" />
            </SelectTrigger>
            <SelectContent>
              {meses.map(mes => (
                <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
          {loading ? (
            renderSkeletons()
          ) : filteredBirthdays.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
              {filteredBirthdays.map((birthday) => (
                <BirthdayCard 
                  key={birthday.id} 
                  birthday={birthday}
                  onEdit={() => setBirthdayToEdit(birthday)}
                  onDelete={() => setBirthdayToDelete(birthday)}
                  onSendEmail={() => setBirthdayToSendEmail(birthday)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
                <p className="text-lg font-medium">No se encontraron cumpleaños</p>
                <p>Intenta ajustar los filtros de búsqueda o añade nuevos cumpleaños.</p>
            </div>
          )}
      </ScrollArea>
      
      <AlertDialog open={!!birthdayToDelete} onOpenChange={(open) => !open && setBirthdayToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el cumpleaños de <span className="font-semibold">{birthdayToDelete?.['nombre funcionario']}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!birthdayToSendEmail} onOpenChange={(open) => !open && setBirthdayToSendEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Correo de Felicitación</AlertDialogTitle>
            <AlertDialogDescription>
                ¿Estás seguro de que quieres enviar una felicitación de cumpleaños a <span className="font-semibold">{birthdayToSendEmail?.correo}</span>?
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

      
      <EditBirthdayDialog
        birthday={birthdayToEdit}
        open={!!birthdayToEdit}
        onOpenChange={(open) => !open && setBirthdayToEdit(null)}
       />
    </>
  );
}
