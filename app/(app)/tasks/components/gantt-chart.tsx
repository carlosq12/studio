'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Task } from '@/lib/types';
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  getDaysInMonth,
} from 'date-fns';
import { useMemo } from 'react';
import { ChartContainer } from '@/components/ui/chart';

interface GanttChartProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  currentYear: number;
}

const statusColors: Record<string, string> = {
  Pendiente: 'hsl(var(--muted-foreground)/0.5)',
  'En Progreso': 'hsl(var(--chart-2))',
  Completada: 'hsl(var(--chart-1))',
  Atrasada: 'hsl(var(--destructive))',
};

const meses_en_espanol = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function GanttChart({ tasks, onTaskSelect, currentYear }: GanttChartProps) {
  const { chartData, yAxisLabels, monthLabels } = useMemo(() => {
    if (!tasks) {
      return { chartData: [], yAxisLabels: [], monthLabels: [] };
    }

    const uniqueTaskNames = Array.from(new Set(tasks.map(t => t['nombre tarea'])));

    const chartData: any[] = [];
    tasks.forEach(task => {
        let activeRanges: { start: number, end: number }[] = [];

        if (task.tipo_tarea === 'Mensual' && task.meses_seleccionados) {
            task.meses_seleccionados.forEach(monthName => {
                const monthIndex = meses_en_espanol.indexOf(monthName);
                if (monthIndex !== -1) {
                    const daysInMonth = getDaysInMonth(new Date(currentYear, monthIndex));
                    const startDay = task.dia_inicio_mensual || 1;
                    const endDay = task.dia_fin_mensual || daysInMonth;
                    
                    const start = monthIndex + (startDay - 1) / daysInMonth;
                    const end = monthIndex + endDay / daysInMonth;
                    activeRanges.push({ start, end });
                }
            });
        } else if (task.tipo_tarea === 'Anual' && task.mes_anual) {
            const monthIndex = meses_en_espanol.indexOf(task.mes_anual);
            if (monthIndex !== -1) {
                if (task.dia_inicio_mensual && task.dia_fin_mensual) {
                    const daysInMonth = getDaysInMonth(new Date(currentYear, monthIndex));
                    const startDay = task.dia_inicio_mensual;
                    const endDay = task.dia_fin_mensual;
                    
                    const start = monthIndex + (startDay - 1) / daysInMonth;
                    const end = monthIndex + endDay / daysInMonth;
                    activeRanges.push({ start, end });
                } else {
                    activeRanges.push({ start: monthIndex, end: monthIndex + 1 });
                }
            }
        } else if (task.fecha_inicio) {
            const startDate = parseISO(task.fecha_inicio);
            const endDate = task.fecha_fin ? parseISO(task.fecha_fin) : startDate;

            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const startYear = startDate.getFullYear();
                const endYear = endDate.getFullYear();

                if (startYear <= currentYear && endYear >= currentYear) {
                    const monthStart = (startYear < currentYear) ? 0 : startDate.getMonth();
                    const dayStart = (startYear < currentYear) ? 1 : startDate.getDate();
                    const monthEnd = (endYear > currentYear) ? 11 : endDate.getMonth();
                    const dayEnd = (endYear > currentYear) ? getDaysInMonth(new Date(currentYear, 11)) : endDate.getDate();

                    const start = monthStart + (dayStart - 1) / getDaysInMonth(new Date(currentYear, monthStart));
                    const end = monthEnd + dayEnd / getDaysInMonth(new Date(currentYear, monthEnd));
                    activeRanges.push({ start, end });
                }
            }
        }
        
        activeRanges.forEach(range => {
            chartData.push({
                y: task['nombre tarea'],
                x: [range.start, range.end],
                fill: task.color || statusColors[task.estado] || statusColors['Pendiente'],
                task: task,
            });
        });
    });

    return {
      chartData,
      yAxisLabels: uniqueTaskNames,
      monthLabels: meses_en_espanol,
    };
  }, [tasks, currentYear]);

  if (tasks.length === 0) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center rounded-lg border border-dashed p-4">
        <p className="text-muted-foreground">No hay tareas para mostrar en la Carta Gantt.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px]">
      <ChartContainer config={{}} className="h-full w-full">
        <ResponsiveContainer>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
            barCategoryGap="40%"
          >
            <XAxis 
              type="number" 
              dataKey="x[0]" 
              domain={[0, 12]} 
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]} 
              tickFormatter={(tick) => monthLabels[tick]} 
              axisLine={false} 
              tickLine={false} 
              interval={0}
            />
            <YAxis
              type="category"
              dataKey="y"
              domain={yAxisLabels}
              width={150}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            
            <Bar dataKey="x" radius={4}>
                {chartData.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill}
                        className="cursor-pointer"
                        onClick={() => onTaskSelect(entry.task)}
                    />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
