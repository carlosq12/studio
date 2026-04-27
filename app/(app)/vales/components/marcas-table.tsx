import { useState, useMemo } from 'react';
// ... (rest of imports from 4 to 25 remain similar)
import type { MarcaVale } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Trash2, Eye, CheckCircle2, Edit3, Save, X, Loader2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MarcaDetailsDialog } from './marca-details-dialog';


interface MarcasTableProps {
  marcas: MarcaVale[];
  isLoading: boolean;
  onDeleteMarca?: (marca: MarcaVale) => void;
}

export function MarcasTable({ marcas, isLoading, onDeleteMarca }: MarcasTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<MarcaVale | null>(null);
  const handleUpdateSuccess = (updatedMarca: MarcaVale) => {
      setSelectedDetails(prev => prev ? { ...prev, diasTrabajados: updatedMarca.diasTrabajados } : null);
  };

  const filteredMarcas = marcas.filter(m => 
    (m.nombres || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.RUT || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.mes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm w-full">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por funcionario, RUT o mes..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="rounded-md border">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead>Funcionario</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead className="text-right">Días Trab.</TableHead>
                <TableHead className="text-right">Ausencias</TableHead>
                <TableHead className="text-right">Viáticos</TableHead>
                <TableHead className="text-right">Monto Asignado</TableHead>
                <TableHead>Fecha Carga</TableHead>
                <TableHead className="w-[50px]"></TableHead>
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
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : filteredMarcas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No se han registrado marcas de vales aún.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMarcas.map((m) => (
                  <TableRow key={m.id}>
                     <TableCell className="font-semibold">{m.mes}</TableCell>
                     <TableCell>{m.nombres} {m.apellidos || ''}</TableCell>
                     <TableCell className="font-medium">{m.RUT}</TableCell>
                     <TableCell className="text-right">{m.diasTrabajados}</TableCell>
                     <TableCell className="text-right text-destructive">
                        {m.diasAusencia > 0 ? m.diasAusencia : '-'}
                     </TableCell>
                     <TableCell className="text-right text-orange-600 font-medium font-mono">
                        {(m.viaticos ?? 0) > 0 ? `-${m.viaticos}` : '-'}
                     </TableCell>
                     <TableCell className="text-right font-bold text-green-700">
                        {m.montoAsignado ? `$${m.montoAsignado.toLocaleString('es-CL')}` : '-'}
                     </TableCell>
                     <TableCell className="text-muted-foreground text-xs">
                        {m.fechaCarga?.toDate 
                          ? format(m.fechaCarga.toDate(), "d MMM yyyy HH:mm", { locale: es }) 
                          : typeof m.fechaCarga === 'string' 
                            ? format(new Date(m.fechaCarga), "d MMM yyyy HH:mm", { locale: es })
                            : '-'}
                     </TableCell>
                     <TableCell className="text-right">
                       <button 
                           onClick={() => setSelectedDetails(m)}
                           className="text-blue-600 hover:text-blue-800 transition-colors mr-3"
                           title="Ver detalle de marcas"
                         >
                           <Eye className="h-4 w-4" />
                       </button>
                       {onDeleteMarca && (
                         <button 
                           onClick={() => onDeleteMarca(m)}
                           className="text-muted-foreground hover:text-destructive transition-colors"
                           title="Eliminar registro individual"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       )}
                     </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <MarcaDetailsDialog 
        selectedDetails={selectedDetails} 
        onClose={() => setSelectedDetails(null)} 
        allowEditing={true}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </div>
  );
}
