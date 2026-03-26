'use client';

import { PageHeader } from "@/components/page-header";
import { AddInventoryItemDialog } from "./components/add-inventory-item-dialog";
import { BulkUploadInventorySheet } from "./components/bulk-upload-inventory-sheet";
import InventoryTable from "./components/inventory-table";
import { ScanQrDialog } from "./components/scan-qr-dialog";
import { ManualStockDialog } from "./components/manual-stock-dialog";
import { useState } from "react";
import { StockMovementDialog } from "./components/stock-movement-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, HardDrive, Archive, LayoutDashboard } from "lucide-react";
import InventoryEquiposTable from "../inventory-equipos/components/inventory-equipos-table";
import { EquipoDetailsDialog } from "../inventory-equipos/components/equipo-details-dialog";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { doc, getDoc, collection, query, orderBy } from "firebase/firestore";
import type { InventarioEquipo, Archivador } from "@/lib/types";
import { BulkUploadEquiposSheet } from '../inventory-equipos/components/bulk-upload-equipos-sheet';
import { AddEquipoDialog } from "../inventory-equipos/components/add-equipo-dialog";
import { Card } from "@/components/ui/card";
import InventoryArchivesList from "./components/inventory-archives-list";
import { useToast } from "@/hooks/use-toast";
import { InventoryDashboard } from "./components/inventory-dashboard";
import { InventoryReportDialog } from "./components/inventory-report-dialog";
import { QRCodeDialog } from "./components/qr-code-dialog";

export default function InventoryPage() {
  const [itemForStock, setItemForStock] = useState<string | null>(null);
  const [equipoToView, setEquipoToView] = useState<InventarioEquipo | null>(null);
  const [equipoToCopy, setEquipoToCopy] = useState<InventarioEquipo | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const equiposQuery = useMemoFirebase(() => firestore ? collection(firestore, 'inventario_equipos') : null, [firestore]);
  const { data: allEquipos } = useCollection<InventarioEquipo>(equiposQuery);

  const archivesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'archivadores_inventario'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: archivadores } = useCollection<Archivador>(archivesQuery);

  const handleQrDetected = async (scannedValue: string) => {
    if (!firestore) return;
    
    const equipoRef = doc(firestore, 'inventario_equipos', scannedValue);
    try {
        const equipoSnap = await getDoc(equipoRef);
        if (equipoSnap.exists()) {
            setEquipoToView({ id: equipoSnap.id, ...equipoSnap.data() } as InventarioEquipo);
            return;
        }
    } catch (e) {}

    const itemRef = doc(firestore, 'inventario', scannedValue);
    try {
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
            setItemForStock(scannedValue);
            return;
        }
    } catch (e) {}

    toast({
        variant: "destructive",
        title: "Código no reconocido",
        description: `El código "${scannedValue}" no corresponde a ningún registro en nuestro sistema.`,
    });
  };
  
  return (
    <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full">
      <PageHeader
          title="Inventario"
          description="Gestionar y monitorear los items y equipos del inventario."
      >
        <div className="flex items-center gap-2">
            <InventoryReportDialog equipos={allEquipos || []} archivadores={archivadores || []} />
        </div>
      </PageHeader>
      
      <Tabs defaultValue="inicio" className="flex-1 flex flex-col">
        <TabsList className="self-start mb-4 bg-white p-1 rounded-xl shadow-sm border h-auto flex-wrap">
            <TabsTrigger value="inicio" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                <LayoutDashboard className="h-4 w-4"/> Inicio
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                <Boxes className="h-4 w-4"/> Inventario General
            </TabsTrigger>
            <TabsTrigger value="equipos" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                <HardDrive className="h-4 w-4"/> Inventario de Equipos
            </TabsTrigger>
            <TabsTrigger value="archives" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                <Archive className="h-4 w-4"/> Archivadores
            </TabsTrigger>
        </TabsList>

        <TabsContent value="inicio" className="flex-1">
            <InventoryDashboard />
        </TabsContent>

        <TabsContent value="general" className="flex-1 flex flex-col">
          <Card className="h-full flex-1 overflow-hidden flex flex-col border-none shadow-sm">
            <div className="p-4 border-b flex flex-wrap items-center gap-3 bg-white">
                <ManualStockDialog onItemSelect={setItemForStock} />
                <ScanQrDialog onQrCodeDetected={handleQrDetected} />
                <div className="ml-auto flex items-center gap-2">
                    <BulkUploadInventorySheet />
                    <AddInventoryItemDialog />
                </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                <InventoryTable />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="equipos" className="flex-1 flex flex-col">
          <Card className="h-full flex-1 overflow-hidden flex flex-col border-none shadow-sm">
             <div className="p-4 border-b flex flex-wrap items-center gap-3 bg-white">
                <ScanQrDialog onQrCodeDetected={handleQrDetected} />
                 <div className="ml-auto flex items-center gap-2">
                    <BulkUploadEquiposSheet />
                    <AddEquipoDialog />
                </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                <InventoryEquiposTable onCopyTo={setEquipoToCopy} showArchived={false} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="archives" className="flex-1 flex flex-col">
            <Card className="h-full flex-1 overflow-hidden flex flex-col p-6 border-none shadow-sm bg-white">
                <div className="mb-6">
                    <h2 className="text-xl font-bold font-headline text-slate-800">Equipos Archivados</h2>
                    <p className="text-sm text-muted-foreground">Gestiona los equipos que han sido movidos a carpetas organizativas.</p>
                </div>
                <InventoryArchivesList />
            </Card>
        </TabsContent>
      </Tabs>
      
      <StockMovementDialog
        itemId={itemForStock}
        open={!!itemForStock}
        onOpenChange={(isOpen) => {
          if (!isOpen) setItemForStock(null);
        }}
      />
      
      <EquipoDetailsDialog
        equipo={equipoToView}
        open={!!equipoToView}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEquipoToView(null);
        }}
      />

       <AddEquipoDialog
        initialData={equipoToCopy}
        open={!!equipoToCopy}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEquipoToCopy(null);
        }}
      />
    </main>
  );
}
