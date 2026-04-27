import type { MarcaVale } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ViaticosRawDetailsDialogProps {
    selectedDetails: MarcaVale | null;
    onClose: () => void;
}

export function ViaticosRawDetailsDialog({ selectedDetails, onClose }: ViaticosRawDetailsDialogProps) {
    return (
        <Dialog open={!!selectedDetails} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalle de Viáticos en Excel: {selectedDetails?.nombres}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    {selectedDetails?.detallesViaticos && selectedDetails.detallesViaticos.length > 0 ? (
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        {Object.keys(selectedDetails.detallesViaticos[0]).map(k => <TableHead key={k}>{k}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedDetails.detallesViaticos.map((r: any, idx: number) => (
                                        <TableRow key={idx}>
                                            {Object.entries(r).map(([k, v]: [string, any], i: number) => {
                                                let displayValue = String(v);
                                                if (k.toLowerCase().includes('fecha') && typeof v === 'number' && v > 20000 && v < 70000) {
                                                    const excelEpoch = new Date(1899, 11, 30);
                                                    const dateObj = new Date(excelEpoch.getTime() + v * 86400000);
                                                    displayValue = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                                                }
                                                return <TableCell key={i}>{displayValue}</TableCell>;
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No hay detalles del archivo Excel disponibles para este registro. Es posible que este descuento de viáticos se haya cargado antes de la actualización del sistema o de forma manual.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
