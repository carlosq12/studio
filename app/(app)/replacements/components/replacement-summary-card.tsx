'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, Clock, CheckCircle, SkipForward } from "lucide-react";
import type { Replacement } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from 'firebase/firestore';

interface ReplacementSummaryCardProps {
    summary: {
        totalDays: number;
        relatedPeople: { name: string, days: number }[];
        currentReplacement: Replacement | null;
        lastReplacement: Replacement | null;
        nextReplacement: Replacement | null;
    }
    viewBy: 'reemplazado' | 'reemplazante';
    onViewPersonHistory: (personName: string) => void;
    onViewReplacement: (replacement: Replacement) => void;
}

const SummaryItem = ({ icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div>
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            {React.createElement(icon, { className: "h-4 w-4" })}
            {title}
        </p>
        <div className="pl-6 text-sm mt-1">
            {children}
        </div>
    </div>
);

const ReplacementInfo = ({ replacement, onView, viewBy }: { replacement: Replacement | null, onView: (replacement: Replacement) => void, viewBy: 'reemplazado' | 'reemplazante' }) => {
    if (!replacement) return <p className="text-muted-foreground">Ninguno</p>;

    const fromDateObj = replacement.DESDE instanceof Timestamp ? replacement.DESDE.toDate() : (replacement.DESDE ? new Date(replacement.DESDE as any) : null);
    const toDateObj = replacement.HASTA instanceof Timestamp ? replacement.HASTA.toDate() : (replacement.HASTA ? new Date(replacement.HASTA as any) : null);

    const fromDate = fromDateObj ? format(fromDateObj, "d MMM", { locale: es }) : '';
    const toDate = toDateObj ? format(toDateObj, "d MMM", { locale: es }) : '';
    
    const displayName = viewBy === 'reemplazante' ? replacement['NOMBRE REEMPLAZADO'] : replacement.NOMBRE;

    return (
        <button className="text-left hover:underline" onClick={() => onView(replacement)}>
            <span className="font-semibold text-foreground">{displayName}</span>
            <span className="text-muted-foreground text-xs"> ({fromDate} - {toDate})</span>
        </button>
    );
}

export function ReplacementSummaryCard({ summary, viewBy, onViewPersonHistory, onViewReplacement }: ReplacementSummaryCardProps) {
    const totalMonths = Math.round(summary.totalDays / 30);
    const cardTitle = viewBy === 'reemplazante' ? 'Resumen del Reemplazante' : 'Resumen del Funcionario';
    const totalDaysLabel = viewBy === 'reemplazante' ? 'Total de Días Trabajados' : 'Total de Días Reemplazado';
    const relatedPeopleListTitle = viewBy === 'reemplazante' ? 'Funcionarios Reemplazados' : 'Reemplazado Por';
    const emptyRelatedPeopleText = viewBy === 'reemplazante' ? 'No ha reemplazado a nadie aún.' : 'No ha sido reemplazado aún.';

    return (
        <Card className="bg-background/80 backdrop-blur-sm animate-in fade-in-50">
            <CardHeader>
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-primary"/>
                    <span>{cardTitle}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">{totalDaysLabel}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold">{summary.totalDays}</p>
                        {summary.totalDays > 0 && <p className="text-sm text-muted-foreground">(aprox. {totalMonths} {totalMonths === 1 ? 'mes' : 'meses'})</p>}
                    </div>
                </div>
                
                <div className="space-y-3">
                    <SummaryItem icon={Clock} title="Reemplazo Actual">
                        <ReplacementInfo replacement={summary.currentReplacement} onView={onViewReplacement} viewBy={viewBy} />
                    </SummaryItem>

                     <SummaryItem icon={SkipForward} title="Próximo Reemplazo">
                        <ReplacementInfo replacement={summary.nextReplacement} onView={onViewReplacement} viewBy={viewBy} />
                    </SummaryItem>

                    <SummaryItem icon={CheckCircle} title="Último Reemplazo Completado">
                        <ReplacementInfo replacement={summary.lastReplacement} onView={onViewReplacement} viewBy={viewBy} />
                    </SummaryItem>
                </div>


                <SummaryItem icon={Users} title={relatedPeopleListTitle}>
                    {summary.relatedPeople.length > 0 ? (
                        <ul className="list-disc list-inside mt-1">
                            {summary.relatedPeople.map((person, index) => (
                                <li key={index}>
                                    <Button 
                                      variant="link" 
                                      className="p-0 h-auto text-left"
                                      onClick={() => onViewPersonHistory(person.name)}
                                    >
                                        {person.name} ({person.days} {person.days === 1 ? 'día' : 'días'})
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">{emptyRelatedPeopleText}</p>
                    )}
                </SummaryItem>
            </CardContent>
        </Card>
    )
}
