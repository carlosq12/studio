'use client';

import { useState } from 'react';
import type { FuncionarioVale } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Edit, Trash2, CalendarSearch } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddFuncionarioValeDialog } from './add-funcionario-vale-dialog';
import { deleteFuncionarioVale, deleteFuncionariosValesMasivos } from '../actions';
import { BulkUploadFuncionariosValesSheet } from './bulk-upload-funcionarios-vales-sheet';

interface ValesFuncionariosTableProps {
  funcionarios: FuncionarioVale[];
  isLoading: boolean;
  onViewMarcas?: (id: string) => void;
}

export function ValesFuncionariosTable({ funcionarios, isLoading, onViewMarcas }: ValesFuncionariosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<FuncionarioVale | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingMasivo, setIsDeletingMasivo] = useState(false);
  const { toast } = useToast();

  const filteredFuncionarios = funcionarios.filter(f => 
    (f.nombres || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (f.RUT || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
      if (confirm('¿Estás seguro de eliminar este funcionario de la base de datos de Vales?')) {
          const result = await deleteFuncionarioVale(id);
          if (result.success) {
              toast({ title: 'Funcionario eliminado exitosamente' });
              setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
          } else {
              toast({ variant: 'destructive', title: 'Error', description: result.error });
          }
      }
  };

  const handleToggleSelectAll = () => {
      if (selectedIds.length === filteredFuncionarios.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(filteredFuncionarios.map(f => f.id));
      }
  };

  const handleToggleSelect = (id: string) => {
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };

  const handleDeleteMasivo = async () => {
      if (selectedIds.length === 0) return;
      if (confirm(`¿Estás seguro de eliminar masivamente los ${selectedIds.length} funcionarios seleccionados? Esta acción no se puede deshacer.`)) {
          setIsDeletingMasivo(true);
          const result = await deleteFuncionariosValesMasivos(selectedIds);
          setIsDeletingMasivo(false);
          
          if (result.success) {
              toast({ title: 'Eliminación masiva exitosa', description: `Se eliminaron ${result.count} funcionarios.` });
              setSelectedIds([]);
          } else {
              toast({ variant: 'destructive', title: 'Error', description: result.error });
          }
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o RUT..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteMasivo} 
                disabled={isDeletingMasivo}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar {selectedIds.length} selec.
            </Button>
          )}
          <BulkUploadFuncionariosValesSheet />
          <Button onClick={() => { setEditingFuncionario(null); setIsAddDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Funcionario
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                   <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-primary" 
                      checked={filteredFuncionarios.length > 0 && selectedIds.length === filteredFuncionarios.length}
                      onChange={handleToggleSelectAll}
                   />
                </TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Jornada</TableHead>
                <TableHead>AC-No.</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredFuncionarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No hay funcionarios registrados en Vales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFuncionarios.map((f) => (
                  <TableRow key={f.id} className={selectedIds.includes(f.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 cursor-pointer accent-primary"
                            checked={selectedIds.includes(f.id)}
                            onChange={() => handleToggleSelect(f.id)}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{f.RUT}</TableCell>
                    <TableCell>{f.nombres} {f.apellidos || ''}</TableCell>
                    <TableCell>{f.jornada || '-'}</TableCell>
                    <TableCell>{f.acNo || '-'}</TableCell>
                    <TableCell>{f.departamento || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={f.estado === 'Activo' ? 'default' : 'secondary'}>
                        {f.estado || 'Activo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {onViewMarcas && (
                           <Button variant="ghost" size="icon" title="Ver sus Marcas" onClick={() => onViewMarcas(f.id)}>
                              <CalendarSearch className="h-4 w-4 text-blue-600" />
                           </Button>
                       )}
                       <Button variant="ghost" size="icon" title="Editar" onClick={() => { setEditingFuncionario(f); setIsAddDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" title="Eliminar" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(f.id)}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <AddFuncionarioValeDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        funcionario={editingFuncionario} 
      />
    </div>
  );
}
