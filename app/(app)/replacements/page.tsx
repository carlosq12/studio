
'use client';

import { PageHeader } from "@/components/page-header";
import { AddReplacementDialog } from "./components/add-replacement-dialog";
import ReplacementsTable from "./components/replacements-table";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkUploadReplacementsSheet } from "./components/bulk-upload-replacements-sheet";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, Timestamp } from 'firebase/firestore';
import { getMonth, getYear, isSameDay, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { List, Clock, Archive, LayoutDashboard, Calendar, Users } from "lucide-react";
import type { Replacement, IngresoFuncionario, MonthlyTemplate } from "@/lib/types";
import { ReplacementsFilters } from "./components/replacements-filters";
import { AddArchiveDialog } from "../archives/components/add-archive-dialog";
import ArchivesList from "../archives/components/archives-list";
import { ReportDialog } from "./components/report-dialog";
import { MonthlyTemplatesDialog } from "./components/monthly-templates-dialog";
import { ManualGenerationButton } from "./components/manual-generation-button";
import { ReplacementsDashboard } from "./components/replacements-dashboard";
import { PersonHistoryView } from "./components/person-history-view";

const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

export default function ReplacementsPage() {
    const firestore = useFirestore();
    const replacementsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'reemplazos')) : null, [firestore]);
    const { data: replacements, loading } = useCollection<Replacement>(replacementsQuery);

    const funcionariosQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'INGRESO_FUNCIONARIOS')) : null, [firestore]);
    const { data: funcionarios } = useCollection<IngresoFuncionario>(funcionariosQuery);

    const templatesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'reemplazos_mensuales')) : null, [firestore]);
    const { data: monthlyTemplates } = useCollection<MonthlyTemplate>(templatesQuery);

    const [replacementToCopy, setReplacementToCopy] = useState<Replacement | null>(null);
    const [nameFilter, setNameFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | undefined>();
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [showArchived, setShowArchived] = useState(false);

    const funcionarioOptions = useMemo(() => {
        if (!funcionarios) return [];
        return funcionarios.map(f => {
            const firstName = f.NOMBRES || '';
            const lastName = [f['APELLIDO P'], f['APELLIDO M']].filter(Boolean).join(' ');
            const fullName = [firstName, lastName].filter(Boolean).join(' ');
            return { label: fullName, value: fullName, rut: f.RUT, id: f.id };
        }).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
    }, [funcionarios]);

    const allFilteredData = useMemo(() => {
        if (!replacements) return [];
        let filtered = replacements.filter(rep => {
          const lowerCaseFilter = nameFilter.toLowerCase();
          const nameMatch = !nameFilter || 
            (rep.NOMBRE && rep.NOMBRE.toLowerCase().includes(lowerCaseFilter)) ||
            (rep['NOMBRE REEMPLAZADO'] && rep['NOMBRE REEMPLAZADO'].toLowerCase().includes(lowerCaseFilter));

          const estadoRNR = (rep.ESTADO_R_NR || (rep as any)['ESTADO R/NR'] || '').trim().toUpperCase();
          const statusMatch = !statusFilter || (estadoRNR === statusFilter.toUpperCase());
          
          const repDate = parseDate(rep.DESDE);
          const dateMatch = !dateFilter || (repDate && isSameDay(repDate, dateFilter));
          const monthMatch = !monthFilter || (repDate && getMonth(repDate).toString() === monthFilter);
          const yearMatch = !yearFilter || (repDate && getYear(repDate).toString() === yearFilter);
          
          return nameMatch && statusMatch && dateMatch && monthMatch && yearMatch;
        });

        return filtered.sort((a, b) => {
            const dateA = parseDate(a.DESDE)?.getTime() || 0;
            const dateB = parseDate(b.DESDE)?.getTime() || 0;
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }, [replacements, nameFilter, statusFilter, dateFilter, monthFilter, yearFilter, sortOrder]);

    // Pestaña Lista: Solo los que NO están archivados (o todos si showArchived es true)
    const listData = useMemo(() => {
        if (showArchived) return allFilteredData;
        return allFilteredData.filter(rep => !rep.archivadorId || rep.archivadorId === "");
    }, [allFilteredData, showArchived]);

    // Pestaña Pendientes: Los que están "EN PROCESO" o "NO", incluso si están archivados
    const pendingData = useMemo(() => {
        return allFilteredData.filter(rep => {
            const estadoRNR = (rep.ESTADO_R_NR || (rep as any)['ESTADO R/NR'] || '').trim().toUpperCase();
            return (estadoRNR === 'EN PROCESO' || estadoRNR === 'NO');
        });
    }, [allFilteredData]);

    const archivedData = useMemo(() => {
        return allFilteredData.filter(rep => rep.archivadorId && rep.archivadorId !== "");
    }, [allFilteredData]);

  return (
    <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full">
      <PageHeader title="Gestión de Reemplazos">
        <div className="flex items-center gap-2">
            <ReportDialog replacements={replacements || []} />
            <ManualGenerationButton />
            <MonthlyTemplatesDialog />
            <BulkUploadReplacementsSheet />
            <AddReplacementDialog 
                funcionarios={funcionarios || []}
                funcionarioOptions={funcionarioOptions}
            />
        </div>
      </PageHeader>
      
        <Tabs defaultValue="inicio" className="flex-1 flex flex-col">
            <TabsList className="self-start border-b-0 gap-1 bg-white p-1 rounded-xl shadow-sm border mb-6 h-auto flex-wrap">
                <TabsTrigger value="inicio" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                    <LayoutDashboard className="h-4 w-4"/> Inicio
                </TabsTrigger>
                <TabsTrigger value="by-employee" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                    <Calendar className="h-4 w-4"/> Por Funcionario
                </TabsTrigger>
                <TabsTrigger value="by-replacer" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                    <Users className="h-4 w-4"/> Por Reemplazante
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                    <List className="h-4 w-4"/> Lista ({listData.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                    <Clock className="h-4 w-4"/> Pendientes ({pendingData.length})
                </TabsTrigger>
                <TabsTrigger value="archives" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-4">
                    <Archive className="h-4 w-4"/> Archivadores ({archivedData.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="inicio">
                <ReplacementsDashboard replacements={replacements} loading={loading} />
            </TabsContent>

            <TabsContent value="by-employee">
                <PersonHistoryView 
                    viewBy="reemplazado" 
                    replacements={replacements || []} 
                    funcionarioOptions={funcionarioOptions}
                    funcionarios={funcionarios || []}
                    monthlyTemplates={monthlyTemplates || []}
                />
            </TabsContent>

            <TabsContent value="by-replacer">
                <PersonHistoryView 
                    viewBy="reemplazante" 
                    replacements={replacements || []} 
                    funcionarioOptions={funcionarioOptions}
                    funcionarios={funcionarios || []}
                    monthlyTemplates={monthlyTemplates || []}
                />
            </TabsContent>

            <TabsContent value="list" className="flex flex-col flex-1">
                <Card className="overflow-hidden border shadow-sm bg-white rounded-xl flex-1 flex flex-col">
                    <ReplacementsFilters 
                        nameFilter={nameFilter} setNameFilter={setNameFilter}
                        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                        dateFilter={dateFilter} setDateFilter={setDateFilter}
                        monthFilter={monthFilter} setMonthFilter={setMonthFilter}
                        yearFilter={yearFilter} setYearFilter={setYearFilter}
                        sortOrder={sortOrder} toggleSortOrder={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
                        clearFilters={() => { setNameFilter(''); setStatusFilter(''); setDateFilter(undefined); setMonthFilter(''); setYearFilter(''); }}
                        showArchived={showArchived} setShowArchived={setShowArchived}
                    />
                    <ReplacementsTable 
                        replacements={listData} loading={loading}
                        funcionarios={funcionarios || []} funcionarioOptions={funcionarioOptions}
                        onCopy={setReplacementToCopy} monthlyTemplates={monthlyTemplates || []}
                    />
                </Card>
            </TabsContent>

            <TabsContent value="pending" className="flex flex-col flex-1">
                <ReplacementsTable 
                    replacements={pendingData} loading={loading}
                    funcionarios={funcionarios || []} funcionarioOptions={funcionarioOptions}
                    onCopy={setReplacementToCopy} monthlyTemplates={monthlyTemplates || []}
                />
            </TabsContent>

            <TabsContent value="archives">
                <Card className="p-6 rounded-xl border shadow-sm bg-white">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold font-headline">Archivadores de Reemplazos</h2>
                        <AddArchiveDialog />
                    </div>
                    <ArchivesList funcionarios={funcionarios || []} funcionarioOptions={funcionarioOptions} />
                </Card>
            </TabsContent>
        </Tabs>
        
        <AddReplacementDialog
            initialData={replacementToCopy}
            open={!!replacementToCopy}
            onOpenChange={(isOpen) => !isOpen && setReplacementToCopy(null)}
            funcionarios={funcionarios || []}
            funcionarioOptions={funcionarioOptions}
        />
    </main>
);
}
