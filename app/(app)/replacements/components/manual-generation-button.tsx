'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarClock, Loader2 } from 'lucide-react';
import { generateMonthlyReplacements } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export function ManualGenerationButton() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const nextMonth = addMonths(new Date(), 1);
            const nextMonthKey = format(nextMonth, 'yyyy-MM');
            const nextMonthName = format(nextMonth, 'MMMM', { locale: es });

            const result = await generateMonthlyReplacements(nextMonthKey);
            if (result.error) throw new Error(result.error);

            toast({
                title: 'Generación Manual Exitosa',
                description: `Se han creado ${result.count} nuevas solicitudes para ${nextMonthName}.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error al generar',
                description: error.message || 'No se pudieron generar las solicitudes mensuales.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button variant="outline" onClick={handleGenerate} disabled={isLoading} className="gap-2">
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <CalendarClock className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Generar Mes Siguiente</span>
        </Button>
    );
}
