'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ComboboxField } from '../../ingreso-funcionarios/components/combobox-field';
import type { Replacement, IngresoFuncionario, MonthlyTemplate } from "@/lib/types";
import { ReplacementSummaryCard } from './replacement-summary-card';
import { ReplacementCard } from './replacement-card';
import { ReplacementDetailsDialog } from './replacement-details-dialog';
import { EditReplacementDialog } from './edit-replacement-dialog';
import { Timestamp } from 'firebase/firestore';
import { differenceInDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, UserCircle2, ClipboardList } from 'lucide-react';

interface PersonHistoryViewProps {
    viewBy: 'reemplazado' | 'reemplazante';
    replacements: Replacement[];
    funcionarioOptions: { label: string; value: string; rut?: string; id: string }[];
    funcionarios: IngresoFuncionario[];
    monthlyTemplates: MonthlyTemplate[];
}

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

const historySchema = z.object({
  person: z.string().min(1, 'Selecciona una persona')
});

type HistoryFormValues = z.infer<typeof historySchema>;

export function PersonHistoryView({ viewBy, replacements, funcionarioOptions, funcionarios, monthlyTemplates }: PersonHistoryViewProps) {
    const [selectedPerson, setSelectedPerson] = useState<string>('');
    const [replacementToView, setReplacementToView] = useState<Replacement | null>(null);
    const [replacementToEdit, setReplacementToEdit] = useState<Replacement | null>(null);

    const methods = useForm<HistoryFormValues>({
        resolver: zodResolver(historySchema),
        defaultValues: {
            person: ''
        }
    });

    const personReplacements = useMemo(() => {
        if (!selectedPerson) return [];

        const normalizeString = (str?: string) => str ? str.replace(/\s+/g, '').toLowerCase() : '';
        const normalizedSelected = normalizeString(selectedPerson);

        return replacements.filter(rep => {
            const name = viewBy === 'reemplazado' ? rep['NOMBRE REEMPLAZADO'] : rep.NOMBRE;
            return normalizeString(name) === normalizedSelected;
        }).sort((a, b) => {
            const dateA = parseDate(a.DESDE)?.getTime() || 0;
            const dateB = parseDate(b.DESDE)?.getTime() || 0;
            return dateB - dateA;
        });
    }, [selectedPerson, replacements, viewBy]);

    const summary = useMemo(() => {
        if (!selectedPerson || personReplacements.length === 0) return null;

        const now = new Date();
        let totalDays = 0;
        const relatedMap = new Map<string, number>();
        let current: Replacement | null = null;
        let last: Replacement | null = null;
        let next: Replacement | null = null;

        personReplacements.forEach(rep => {
            const start = parseDate(rep.DESDE);
            const end = parseDate(rep.HASTA);
            const relatedName = viewBy === 'reemplazado' ? rep.NOMBRE : rep['NOMBRE REEMPLAZADO'];

            if (start && end) {
                const days = differenceInDays(end, start) + 1;
                totalDays += days;
                
                if (relatedName) {
                    relatedMap.set(relatedName, (relatedMap.get(relatedName) || 0) + days);
                }

                const sDay = startOfDay(start);
                const eDay = endOfDay(end);

                if (isWithinInterval(now, { start: sDay, end: eDay })) {
                    current = rep;
                } else if (eDay < now) {
                    if (!last || end > (parseDate(last.HASTA) || new Date(0))) {
                        last = rep;
                    }
                } else if (sDay > now) {
                    if (!next || start < (parseDate(next.DESDE) || new Date(8640000000000000))) {
                        next = rep;
                    }
                }
            }
        });

        const relatedPeople = Array.from(relatedMap.entries())
            .map(([name, days]) => ({ name, days }))
            .sort((a, b) => b.days - a.days);

        return {
            totalDays,
            relatedPeople,
            currentReplacement: current,
            lastReplacement: last,
            nextReplacement: next
        };
    }, [personReplacements, selectedPerson, viewBy]);

    const filteredOptions = useMemo(() => {
        const names = new Set<string>();
        replacements.forEach(rep => {
            const name = viewBy === 'reemplazado' ? rep['NOMBRE REEMPLAZADO'] : rep.NOMBRE;
            if (name) names.add(name);
        });

        return Array.from(names)
            .map(name => ({ label: name, value: name, id: name }))
            .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
    }, [replacements, viewBy]);

    const handlePersonChange = (value: string) => {
        setSelectedPerson(value);
        methods.setValue('person', value);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2 text-primary">
                        <Search className="h-5 w-5" />
                        Seleccionar Funcionario
                    </CardTitle>
                    <CardDescription>
                        Busca por nombre para ver el historial detallado de {viewBy === 'reemplazado' ? 'sus reemplazos' : 'las coberturas realizadas'}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md">
                        <FormProvider {...methods}>
                            <form>
                                <ComboboxField
                                    control={methods.control}
                                    name="person"
                                    label=""
                                    options={filteredOptions}
                                    placeholder="Buscar funcionario..."
                                    onValueChange={handlePersonChange}
                                />
                            </form>
                        </FormProvider>
                    </div>
                </CardContent>
            </Card>

            {selectedPerson && summary ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <ReplacementSummaryCard 
                            summary={summary} 
                            viewBy={viewBy}
                            onViewPersonHistory={(name) => handlePersonChange(name)}
                            onViewReplacement={setReplacementToView}
                        />
                    </div>
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-xl font-bold font-headline flex items-center gap-2 px-2 text-foreground">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Historial de Solicitudes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {personReplacements.map(rep => (
                                <ReplacementCard 
                                    key={rep.id}
                                    replacement={rep}
                                    onView={() => setReplacementToView(rep)}
                                    onEdit={() => setReplacementToEdit(rep)}
                                    onDelete={() => {}}
                                    onCopy={() => {}}
                                    isMonthly={monthlyTemplates.some(t => 
                                        t.NOMBRE === rep.NOMBRE && 
                                        t['NOMBRE REEMPLAZADO'] === rep['NOMBRE REEMPLAZADO']
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : selectedPerson ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <UserCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No se encontraron registros para este funcionario.</p>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecciona un funcionario para ver su historial.</p>
                </div>
            )}

            <ReplacementDetailsDialog 
                replacement={replacementToView}
                open={!!replacementToView}
                onOpenChange={(o) => !o && setReplacementToView(null)}
            />

            <EditReplacementDialog 
                replacement={replacementToEdit}
                open={!!replacementToEdit}
                onOpenChange={(o) => !o && setReplacementToEdit(null)}
                funcionarios={funcionarios}
                funcionarioOptions={funcionarioOptions}
            />
        </div>
    );
}
