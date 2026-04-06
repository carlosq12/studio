'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Replacement, IngresoFuncionario, Archivador, MonthlyTemplate } from '@/lib/types';
import React, { useMemo, useState } from 'react';
import { ReplacementCard } from '@/app/(app)/replacements/components/replacement-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { unarchiveReplacements } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { ArchiveRestore, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp, collection } from 'firebase/firestore';
import { ReplacementDetailsDialog } from '../../replacements/components/replacement-details-dialog';
import { EditReplacementDialog } from '../../replacements/components/edit-replacement-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';

interface ViewArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archive: Archivador | null;
  allReplacements: Replacement[];
  funcionarios: IngresoFuncionario[];
  funcionarioOptions: { label: string; value: string; rut?: string; id: string; }[];
}

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
  

export function ViewArchiveDialog({ open, onOpenChange, archive, allReplacements, funcionarios, funcionarioOptions }: ViewArchiveDialogProps) {
  const [selectedReplacements, setSelectedReplacements] = useState<string[]>([]);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const { toast } = useToast();
  
  const [replacementToView, setReplacementToView] = useState<Replacement | null>(null);
  const [replacementToEdit, setReplacementToEdit] = useState<Replacement | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const firestore = useFirestore();
  const templatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reemplazos_mensuales') : null, [firestore]);
  const { data: monthlyTemplates } = useCollection<MonthlyTemplate>(templatesQuery);
  
  const archivedReplacements = useMemo(() => {
    if (!archive) return [];
    
    let filtered = allReplacements.filter(rep => rep.archivadorId === archive.id);

    if (nameFilter) {
      const lowerCaseFilter = nameFilter.toLowerCase();
      filtered = filtered.filter(rep => 
        (rep.NOMBRE?.toLowerCase().includes(lowerCaseFilter)) ||
        (rep['NOMBRE REEMPLAZADO']?.toLowerCase().includes(lowerCaseFilter))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(rep => (rep.ESTADO_R_NR || (rep as any)['ESTADO R/NR']) === statusFilter);
    }

    return filtered;

  }, [archive, allReplacements, nameFilter, statusFilter]);

  const groupedReplacements = useMemo(() => {
    const groups = new Map<string, Replacement[]>();

    archivedReplacements.forEach(rep => {
      const date = parseDate(rep['FECHA DE INGRESO DOC']);
      const dateString = date ? format(date, 'yyyy-MM-dd') : 'Sin Fecha';
      
      if (!groups.has(dateString)) {
        groups.set(dateString, []);
      }
      groups.get(dateString)!.push(rep);
    });

    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => {
          if (dateA === 'Sin Fecha') return 1;
          if (dateB === 'Sin Fecha') return -1;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

  }, [archivedReplacements]);
  
  const toggleSelection = (id: string) => {
    setSelectedReplacements(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectedReplacements.length === archivedReplacements.length) {
      setSelectedReplacements([]);
    } else {
      setSelectedReplacements(archivedReplacements.map(r => r.id));
    }
  };

  const handleUnarchive = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsUnarchiving(true);
    try {
      const result = await unarchiveReplacements(ids);
      if (result.error) throw new Error(result.error);
      
      toast({
        title: '¡Solicitudes desarchivadas!',
        description: `${result.count} solicitud(es) han vuelto a la lista principal.`,
      });

      setSelectedReplacements([]);
      onOpenChange(false);

    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error al desarchivar',
        description: error.message || 'No se pudieron desarchivar las solicitudes.',
      });
    } finally {
      setIsUnarchiving(false);
    }
  };

  const clearFilters = () => {
    setNameFilter('');
    setStatusFilter('');
  }

  const handleOpenDialog = (isOpen: boolean) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setSelectedReplacements([]);
        clearFilters();
      }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenDialog}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">
              Archivador: <span className="text-primary">{archive?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Mostrando {archivedReplacements.length} de {allReplacements.filter(r => r.archivadorId === archive?.id).length} solicitud(es) archivada(s).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                placeholder="Filtrar por nombre..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Estado R/NR" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="SI">SI</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                    <SelectItem value="EN PROCESO">EN PROCESO</SelectItem>
                </SelectContent>
              </Select>
               <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar Filtros
              </Button>
          </div>
          
          {archivedReplacements.length > 0 && (
            <div className="flex items-center space-x-2 py-2 border-t border-b">
              <Checkbox
                id="select-all-archive"
                checked={selectedReplacements.length === archivedReplacements.length && archivedReplacements.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <label
                htmlFor="select-all-archive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Seleccionar Todo
              </label>
            </div>
          )}

          <ScrollArea className="max-h-[50vh] mt-4">
              <div className="space-y-6 p-1">
                  {groupedReplacements.length > 0 ? (
                      groupedReplacements.map(([dateString, reps]) => (
                          <div key={dateString}>
                              <h2 className="text-lg font-semibold font-headline mb-3 capitalize">
                                  {dateString === 'Sin Fecha' ? 'Sin Fecha de Ingreso' : format(new Date(dateString), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })}
                              </h2>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {reps.map(rep => (
                                      <div key={rep.id} className="relative">
                                          <ReplacementCard 
                                              replacement={rep}
                                              monthlyTemplateId={monthlyTemplates?.find(t => 
                                                  t.NOMBRE?.trim().toLowerCase() === rep.NOMBRE?.trim().toLowerCase() && 
                                                  t['NOMBRE REEMPLAZADO']?.trim().toLowerCase() === rep['NOMBRE REEMPLAZADO']?.trim().toLowerCase()
                                              )?.id}
                                              onView={() => setReplacementToView(rep)}
                                              onEdit={() => setReplacementToEdit(rep)}
                                              onDelete={() => { onOpenChange(false); }}
                                              onCopy={() => {}}
                                          />
                                          <Checkbox
                                              checked={selectedReplacements.includes(rep.id)}
                                              onCheckedChange={() => toggleSelection(rep.id)}
                                              className="absolute top-3 left-3 bg-background"
                                          />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="col-span-full h-24 text-center flex items-center justify-center text-muted-foreground">
                          No se encontraron solicitudes con los filtros actuales.
                      </div>
                  )}
              </div>
          </ScrollArea>
          <DialogFooter>
            <Button 
              onClick={() => handleUnarchive(selectedReplacements)}
              disabled={selectedReplacements.length === 0 || isUnarchiving}
            >
              {isUnarchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArchiveRestore className="mr-2 h-4 w-4" />}
              Desarchivar Seleccionadas ({selectedReplacements.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <ReplacementDetailsDialog
        replacement={replacementToView}
        open={!!replacementToView}
        onOpenChange={(open) => !open && setReplacementToView(null)}
      />

      <EditReplacementDialog
        replacement={replacementToEdit}
        open={!!replacementToEdit}
        onOpenChange={(open) => !open && setReplacementToEdit(null)}
        funcionarios={funcionarios}
        funcionarioOptions={funcionarioOptions}
      />
    </>
  );
}
