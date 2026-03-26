
'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, X, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';

interface ReplacementsFiltersProps {
  nameFilter: string;
  setNameFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  dateFilter: Date | undefined;
  setDateFilter: (date: Date | undefined) => void;
  monthFilter: string;
  setMonthFilter: (value: string) => void;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  toggleSortOrder: () => void;
  clearFilters: () => void;
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
}

export function ReplacementsFilters({
  nameFilter,
  setNameFilter,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  monthFilter,
  setMonthFilter,
  yearFilter,
  setYearFilter,
  sortOrder,
  toggleSortOrder,
  clearFilters,
  showArchived,
  setShowArchived,
}: ReplacementsFiltersProps) {

  const uniqueStatuses = ["SI", "NO", "EN PROCESO"];
  const meses = [
    { value: '0', label: 'Enero' }, { value: '1', label: 'Febrero' }, { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' }, { value: '4', label: 'Mayo' }, { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' }, { value: '10', label: 'Noviembre' }, { value: '11', label: 'Diciembre' }
  ];
  const years = Array.from({ length: 15 }, (_, i) => {
    const year = new Date().getFullYear() - 10 + i;
    return { value: year.toString(), label: year.toString() };
  });

  return (
    <div className="p-4 border-b">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <Input 
            placeholder="Buscar por nombre..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="xl:col-span-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Estado R/NR" />
            </SelectTrigger>
            <SelectContent>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn('justify-start text-left font-normal', !dateFilter && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, 'PPP', {locale: es}) : <span>Filtrar por fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar 
                mode="single" 
                selected={dateFilter} 
                onSelect={setDateFilter} 
                initialFocus 
                locale={es}
                captionLayout="dropdown-buttons"
                fromYear={new Date().getFullYear() - 10}
                toYear={new Date().getFullYear() + 10}
               />
            </PopoverContent>
          </Popover>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Mes" />
            </SelectTrigger>
            <SelectContent>
              {meses.map(mes => (
                <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant={showArchived ? "secondary" : "outline"} 
            onClick={() => setShowArchived(!showArchived)}
            className={cn(showArchived && "bg-secondary/20 border-secondary text-secondary")}
          >
            {showArchived ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
            {showArchived ? "Ocultar Archivados" : "Mostrar Archivados"}
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>
  );
}
