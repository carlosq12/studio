'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { MoreVertical, Trash2, Loader2, Eye, Edit, X } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, Firestore } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteEmployee } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDetailsDialog } from './employee-details-dialog';
import { EditEmployeeDialog } from './edit-employee-dialog';
import { EmployeeCard } from './employee-card';
import { ScrollArea } from '@/components/ui/scroll-area';

function useEmployees(db: Firestore | null) {
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'dotacion_personal'));
  }, [db]);
  return useCollection<Employee>(employeesQuery);
}

export default function EmployeesTable() {
  const firestore = useFirestore();
  const { data: employees, loading } = useEmployees(firestore);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [employeeToView, setEmployeeToView] = useState<Employee | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  
  const [nameFilter, setNameFilter] = useState('');
  const [rutFilter, setRutFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const { toast } = useToast();

  const { uniqueTitles, uniqueUnits } = useMemo(() => {
    if (!employees) return { uniqueTitles: [], uniqueUnits: [] };
    const titles = new Set<string>();
    const units = new Set<string>();
    employees.forEach(e => {
        if(e.TITULO) titles.add(e.TITULO);
        if(e['UNIDAD O SERVICIO']) units.add(e['UNIDAD O SERVICIO']);
    });
    return { 
        uniqueTitles: Array.from(titles).sort(),
        uniqueUnits: Array.from(units).sort()
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(employee => {
      const fullName = `${employee['NOMBRE FUNCIONARIO'] || ''} ${employee['APELLIDO PATERNO'] || ''} ${employee['APELLIDO MATERNO'] || ''}`.toLowerCase();
      
      const nameMatch = !nameFilter || fullName.includes(nameFilter.toLowerCase());
      const rutMatch = !rutFilter || (employee.RUT && employee.RUT.includes(rutFilter));
      const titleMatch = !titleFilter || (employee.TITULO && employee.TITULO === titleFilter);
      const unitMatch = !unitFilter || (employee['UNIDAD O SERVICIO'] && employee['UNIDAD O SERVICIO'] === unitFilter);

      return nameMatch && rutMatch && titleMatch && unitMatch;
    });
  }, [employees, nameFilter, rutFilter, titleFilter, unitFilter]);

  const clearFilters = () => {
    setNameFilter('');
    setRutFilter('');
    setTitleFilter('');
    setUnitFilter('');
  };


  const handleDelete = async () => {
    if (!employeeToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteEmployee(employeeToDelete.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Empleado eliminado!',
        description: `${employeeToDelete['NOMBRE FUNCIONARIO']} ha sido eliminado de la lista.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo eliminar el empleado.',
      });
    } finally {
      setIsDeleting(false);
      setEmployeeToDelete(null);
    }
  };

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
      <div className="p-6 border-b">
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
          <Select value={titleFilter} onValueChange={setTitleFilter}>
            <SelectTrigger className="lg:col-span-1">
              <SelectValue placeholder="Filtrar por Cargo" />
            </SelectTrigger>
            <SelectContent>
              {uniqueTitles.map(title => (
                <SelectItem key={title} value={title}>{title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="lg:col-span-1">
              <SelectValue placeholder="Filtrar por Unidad" />
            </SelectTrigger>
            <SelectContent>
              {uniqueUnits.map(unit => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Button variant="outline" onClick={clearFilters} className="lg:col-span-1">
            <X className="mr-2 h-4 w-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
         {loading ? (
          renderSkeletons()
        ) : filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
            {filteredEmployees.map((employee) => (
              <EmployeeCard 
                key={employee.id} 
                employee={employee}
                onViewDetails={() => setEmployeeToView(employee)}
                onEdit={() => setEmployeeToEdit(employee)}
                onDelete={() => setEmployeeToDelete(employee)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-16">
              <p className="text-lg font-medium">No se encontraron empleados</p>
              <p>Intenta ajustar los filtros de búsqueda.</p>
          </div>
        )}
      </ScrollArea>
      
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al empleado <span className="font-semibold">{employeeToDelete?.['NOMBRE FUNCIONARIO']} {employeeToDelete?.['APELLIDO PATERNO']}</span> de la base de datos.
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

      <EmployeeDetailsDialog 
        employee={employeeToView}
        open={!!employeeToView}
        onOpenChange={(open) => !open && setEmployeeToView(null)}
      />

      <EditEmployeeDialog
        employee={employeeToEdit}
        open={!!employeeToEdit}
        onOpenChange={(open) => !open && setEmployeeToEdit(null)}
       />
    </>
  );
}
