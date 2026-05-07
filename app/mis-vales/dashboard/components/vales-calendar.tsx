'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths,
  parse
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock } from 'lucide-react';

interface ValesCalendarProps {
  marcas: any[];
  monthStr?: string; // YYYY-MM
}

export function ValesCalendar({ marcas, monthStr }: ValesCalendarProps) {
  // Si se pasa un mes específico, usamos ese. Si no, el mes de la última marca.
  const initialDate = useMemo(() => {
    if (monthStr) {
      try { return parse(monthStr, 'yyyy-MM', new Date()); } catch(e) { return new Date(); }
    }
    // Usamos el mes del primer registro (el más reciente)
    const latestVale = marcas[0];
    const targetMonth = latestVale?.mesAsistencia || latestVale?.mesPago || latestVale?.mes;
    if (targetMonth) {
      try { return parse(targetMonth, 'yyyy-MM', new Date()); } catch(e) { return new Date(); }
    }
    return new Date();
  }, [monthStr, marcas]);

  const [currentMonth, setCurrentMonth] = useState(initialDate);

  // Sincronizar el mes mostrado si cambian las marcas (ej: al cargar el dashboard)
  useEffect(() => {
    setCurrentMonth(initialDate);
  }, [initialDate]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Mapear marcas a días para búsqueda rápida
  const marcasPorDia = useMemo(() => {
    const map: Record<string, any> = {};
    
    const monthsMap: Record<string, string> = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };

    marcas.forEach(m => {
      if (m.detalles) {
        m.detalles.forEach((d: any) => {
          // Extraer fecha del formato "miércoles 01 abr 2026|08:30"
          const datePart = d.horario.split('|')[0].trim().toLowerCase();
          
          let key = '';
          const match = datePart.match(/(\d{2})\s+(\w{3})\s+(\d{4})/);
          if (match) {
             const day = match[1];
             const monthAbbr = match[2];
             const year = match[3];
             const month = monthsMap[monthAbbr];
             if (month) key = `${year}-${month}-${day}`;
          }

          if (!key) {
            const isoMatch = datePart.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) key = isoMatch[1];
          }

          if (key) {
            map[key] = map[key] || [];
            map[key].push(d);
          }
        });
      }
    });
    return map;
  }, [marcas]);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
        <h3 className="font-bold text-slate-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {days.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayMarcas = marcasPorDia[dateKey];
            const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentMonth));
            const hasMarks = !!dayMarcas;
            const hasValidMarks = dayMarcas?.some((d: any) => d.esValida);

            return (
              <Popover key={i}>
                <PopoverTrigger asChild>
                  <button 
                    disabled={!hasMarks}
                    className={cn(
                      "min-h-[60px] p-2 bg-white flex flex-col items-center justify-start relative transition-all group",
                      !isCurrentMonth && "bg-slate-50/50 text-slate-300",
                      hasMarks ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium mb-1",
                      isCurrentMonth && "text-slate-700"
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {hasMarks && (
                      <div className={cn(
                        "h-2 w-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all group-hover:scale-125",
                        hasValidMarks ? "bg-green-500" : "bg-slate-300"
                      )} />
                    )}
                  </button>
                </PopoverTrigger>
                {hasMarks && (
                  <PopoverContent className="w-56 p-0 shadow-xl border-slate-200" side="top">
                    <div className="p-3 border-b bg-slate-50">
                      <p className="text-xs font-bold text-slate-700">
                        {format(day, "EEEE dd 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                    <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
                      {dayMarcas.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">
                              {m.horario.split('|')[1]}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                            m.esValida ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {m.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Día con Asistencia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-slate-200" />
            <span>Sin Marcas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
