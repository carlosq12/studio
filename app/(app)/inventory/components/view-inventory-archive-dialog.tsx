
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
import type { InventarioEquipo, Archivador } from '@/lib/types';
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { unarchiveEquipos } from '../../inventory-equipos/actions';
import { useToast } from '@/hooks/use-toast';
import { ArchiveRestore, Loader2, X } from 'lucide-react';
import { EquipoCard } from '../../inventory-equipos/components/equipo-card';
import { EquipoDetailsDialog } from '../../inventory-equipos/components/equipo-details-dialog';
import { EditEquipoDialog } from '../../inventory-equipos/components/edit-equipo-dialog';
import { Input } from '@/components/ui/input';

interface ViewInventoryArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archive: Archivador | null;
  allEquipos: InventarioEquipo[];
}

export function ViewInventoryArchiveDialog({ open, onOpenChange, archive, allEquipos }: ViewInventoryArchiveDialogProps) {
  const [selectedEquipos, setSelectedEquipos] = useState<string[]>([]);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const { toast } = useToast();
  
  const [equipoToView, setEquipoToView] = useState<InventarioEquipo | null>(null);
  const [equipoToEdit, setEquipoToEdit] = useState<InventarioEquipo | null>(null);
  const [nameFilter, setNameFilter] = useState('');

  const archivedEquipos = useMemo(() => {
    if (!archive) return [];
    
    let filtered = allEquipos.filter(e => e.archivadorId === archive.id);

    if (nameFilter) {
      const lowerCaseFilter = nameFilter.toLowerCase();
      filtered = filtered.filter(e => 
        (e['nombre equipo']?.toLowerCase().includes(lowerCaseFilter)) ||
        (e.serial?.toLowerCase().includes(lowerCaseFilter)) ||
        (e['ip equipo']?.toLowerCase().includes(lowerCaseFilter))
      );
    }

    return filtered;
  }, [archive, allEquipos, nameFilter]);

  const toggleSelection = (id: string) => {
    setSelectedEquipos(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectedEquipos.length === archivedEquipos.length) {
      setSelectedEquipos([]);
    } else {
      setSelectedEquipos(archivedEquipos.map(e => e.id));
    }
  };

  const handleUnarchive = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsUnarchiving(true);
    try {
      const result = await unarchiveEquipos(ids);
      if (result.error) throw new Error(result.error);
      
      toast({
        title: '¡Equipos desarchivados!',
        description: `${result.count} equipo(s) han vuelto a la lista principal.`,
      });

      setSelectedEquipos([]);
      onOpenChange(false);

    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error al desarchivar',
        description: error.message || 'No se pudieron desarchivar los equipos.',
      });
    } finally {
      setIsUnarchiving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">
              Equipos en Archivador: <span className="text-primary">{archive?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Mostrando {archivedEquipos.length} equipo(s) archivado(s).
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4">
              <Input
                placeholder="Filtrar por nombre, serial o IP..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="flex-1"
              />
               <Button variant="outline" onClick={() => setNameFilter('')}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
          </div>
          
          {archivedEquipos.length > 0 && (
            <div className="flex items-center space-x-2 py-2 border-t border-b">
              <Checkbox
                id="select-all-inventory-archive"
                checked={selectedEquipos.length === archivedEquipos.length && archivedEquipos.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all-inventory-archive" className="text-sm font-medium">
                Seleccionar Todo
              </label>
            </div>
          )}

          <ScrollArea className="max-h-[50vh] mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                  {archivedEquipos.length > 0 ? (
                      archivedEquipos.map(equipo => (
                          <div key={equipo.id} className="relative">
                              <EquipoCard 
                                  equipo={equipo}
                                  onView={() => setEquipoToView(equipo)}
                                  onEdit={() => setEquipoToEdit(equipo)}
                                  onDelete={() => {}}
                                  onShowQr={() => {}}
                                  onCopy={() => {}}
                              />
                              <Checkbox
                                  checked={selectedEquipos.includes(equipo.id)}
                                  onCheckedChange={() => toggleSelection(equipo.id)}
                                  className="absolute top-3 left-3 bg-background z-20"
                              />
                          </div>
                      ))
                  ) : (
                      <div className="col-span-full h-24 text-center flex items-center justify-center text-muted-foreground">
                          No hay equipos archivados con estos criterios.
                      </div>
                  )}
              </div>
          </ScrollArea>
          <DialogFooter>
            <Button 
              onClick={() => handleUnarchive(selectedEquipos)}
              disabled={selectedEquipos.length === 0 || isUnarchiving}
            >
              {isUnarchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArchiveRestore className="mr-2 h-4 w-4" />}
              Desarchivar Seleccionados ({selectedEquipos.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <EquipoDetailsDialog
        equipo={equipoToView}
        open={!!equipoToView}
        onOpenChange={(open) => !open && setEquipoToView(null)}
      />

      <EditEquipoDialog
        equipo={equipoToEdit}
        open={!!equipoToEdit}
        onOpenChange={(open) => !open && setEquipoToEdit(null)}
      />
    </>
  );
}
