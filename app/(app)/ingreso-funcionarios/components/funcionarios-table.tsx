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
import { Input } from '@/components/ui/input';
import { Loader2, X, CalendarIcon, ArrowUp, ArrowDown } from 'lucide-react';
import type { IngresoFuncionario } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, Firestore, Timestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteFuncionario, addBirthdayFromFuncionario } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { EditFuncionarioDialog } from './edit-funcionario-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FuncionarioCard } from './funcionario-card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { FuncionarioDetailsDialog } from './funcionario-details-dialog';
import { SendInfoEmailDialog } from "./send-info-email-dialog";


function useFuncionarios(db: Firestore | null) {
  const funcionariosQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'INGRESO_FUNCIONARIOS'));
  }, [db]);
  return useCollection<IngresoFuncionario>(funcionariosQuery);
}

export default function FuncionariosTable() {
  const firestore = useFirestore();
  const { data: funcionarios, loading } = useFuncionarios(firestore);
  const { toast } = useToast();

  const [isDeleting, setIsDeleting] = useState(false);
  const [funcionarioToDelete, setFuncionarioToDelete] = useState<IngresoFuncionario | null>(null);
  const [funcionarioToEdit, setFuncionarioToEdit] = useState<IngresoFuncionario | null>(null);
  const [funcionarioToView, setFuncionarioToView] = useState<IngresoFuncionario | null>(null);
  const [funcionarioToAddBirthday, setFuncionarioToAddBirthday] = useState<IngresoFuncionario | null>(null);
  const [isAddingBirthday, setIsAddingBirthday] = useState<boolean>(false);
  const [funcionarioToSendEmail, setFuncionarioToSendEmail] = useState<IngresoFuncionario | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [rutFilter, setRutFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  
  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const filteredFuncionarios = useMemo(() => {
    if (!funcionarios) return [];
    
    const filtered = funcionarios.filter(func => {
      const fullName = `${func.NOMBRES || ''} ${func['APELLIDO P'] || ''} ${func['APELLIDO M'] || ''}`.toLowerCase();
      
      const nameMatch = !nameFilter || fullName.includes(nameFilter.toLowerCase());
      const rutMatch = !rutFilter || (func.RUT && func.RUT.includes(rutFilter));
      
      const dateMatch = !dateFilter || (func.FECHA_DE_INGRESO && isSameDay(parseDate(func.FECHA_DE_INGRESO)!, dateFilter));

      return nameMatch && rutMatch && dateMatch;
    });

    return filtered.sort((a, b) => {
        const dateA = parseDate(a.FECHA_DE_INGRESO);
        const dateB = parseDate(b.FECHA_DE_INGRESO);

        if (!dateA) return 1;
        if (!dateB) return -1;

        if (sortOrder === 'asc') {
            return dateA.getTime() - dateB.getTime();
        } else {
            return dateB.getTime() - dateA.getTime();
        }
    });

  }, [funcionarios, nameFilter, rutFilter, dateFilter, sortOrder]);

  const clearFilters = () => {
    setNameFilter('');
    setRutFilter('');
    setDateFilter(undefined);
    setSortOrder('desc');
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };


  const handleDelete = async () => {
    if (!funcionarioToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteFuncionario(funcionarioToDelete.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Funcionario eliminado!',
        description: `${funcionarioToDelete.NOMBRES} ha sido eliminado.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo eliminar el funcionario.',
      });
    } finally {
      setIsDeleting(false);
      setFuncionarioToDelete(null);
    }
  };

  const handleAddBirthday = async () => {
    if (!funcionarioToAddBirthday) return;
    setIsAddingBirthday(true);
    const fullName = `${funcionarioToAddBirthday.NOMBRES || ''} ${funcionarioToAddBirthday['APELLIDO P'] || ''} ${funcionarioToAddBirthday['APELLIDO M'] || ''}`.trim();
    const birthDate = funcionarioToAddBirthday.FECHA_DE_NACIMIENTO;

    if (!birthDate) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'La fecha de nacimiento es requerida para añadir un cumpleaños.',
        });
        setIsAddingBirthday(false);
        setFuncionarioToAddBirthday(null);
        return;
    }

    try {
        const dateString = (birthDate instanceof Timestamp) ? birthDate.toDate().toISOString() : new Date(birthDate).toISOString();

        const result = await addBirthdayFromFuncionario({
            'nombre funcionario': fullName,
            'fecha nacimiento': dateString,
            correo: funcionarioToAddBirthday.CORREO,
            cargo: funcionarioToAddBirthday.CARGO,
        });

        if (result.error) {
            throw new Error(result.error);
        }

        toast({
            title: '¡Cumpleaños añadido!',
            description: `El cumpleaños de ${fullName} ha sido añadido a la lista.`,
        });

    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: '¡Oh no! Algo salió mal.',
            description: error.message || 'No se pudo añadir el cumpleaños.',
        });
    } finally {
        setIsAddingBirthday(false);
        setFuncionarioToAddBirthday(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
           <Input 
            placeholder="Filtrar por nombre..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="lg:col-span-1"
          />
           <Input 
            placeholder="Filtrar por RUT..."
            value={rutFilter}
            onChange={(e) => setRutFilter(e.target.value)}
            className="lg:col-span-1"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'lg:col-span-1 justify-start text-left font-normal',
                  !dateFilter && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, 'PPP', {locale: es}) : <span>Filtrar por Fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
                locale={es}
                captionLayout="dropdown-buttons"
                fromYear={new Date().getFullYear() - 10}
                toYear={new Date().getFullYear() + 10}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={toggleSortOrder} className="lg:col-span-1">
            {sortOrder === 'desc' ? <ArrowDown className="mr-2 h-4 w-4" /> : <ArrowUp className="mr-2 h-4 w-4" />}
            Ordenar por Fecha
          </Button>
           <Button variant="outline" onClick={clearFilters} className="lg:col-span-1">
            <X className="mr-2 h-4 w-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
         {loading ? (
          renderSkeletons()
        ) : filteredFuncionarios.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
            {filteredFuncionarios.map((funcionario) => (
              <FuncionarioCard 
                key={funcionario.id} 
                funcionario={funcionario}
                onViewDetails={() => setFuncionarioToView(funcionario)}
                onEdit={() => setFuncionarioToEdit(funcionario)}
                onDelete={() => setFuncionarioToDelete(funcionario)}
                onAddBirthday={() => setFuncionarioToAddBirthday(funcionario)}
                onSendEmail={() => setFuncionarioToSendEmail(funcionario)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-16">
              <p className="text-lg font-medium">No se encontraron funcionarios</p>
              <p>Intenta ajustar los filtros de búsqueda.</p>
          </div>
        )}
      </ScrollArea>

       <AlertDialog open={!!funcionarioToDelete} onOpenChange={(open) => !open && setFuncionarioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al funcionario <span className="font-semibold">{funcionarioToDelete?.NOMBRES} {funcionarioToDelete?.['APELLIDO P']}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!funcionarioToAddBirthday} onOpenChange={(open) => !open && setFuncionarioToAddBirthday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres añadir el cumpleaños de <span className="font-semibold">{funcionarioToAddBirthday?.NOMBRES} {funcionarioToAddBirthday?.['APELLIDO P']}</span> a la lista de cumpleaños?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAddingBirthday}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddBirthday} disabled={isAddingBirthday}>
              {isAddingBirthday ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Añadiendo...</> : 'Sí, añadir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <FuncionarioDetailsDialog
        funcionario={funcionarioToView}
        open={!!funcionarioToView}
        onOpenChange={(open) => !open && setFuncionarioToView(null)}
      />

      <EditFuncionarioDialog
        funcionario={funcionarioToEdit}
        open={!!funcionarioToEdit}
        onOpenChange={(open) => !open && setFuncionarioToEdit(null)}
      />

      <SendInfoEmailDialog
        funcionario={funcionarioToSendEmail}
        open={!!funcionarioToSendEmail}
        onOpenChange={(open) => !open && setFuncionarioToSendEmail(null)}
      />
    </>
  );
}
