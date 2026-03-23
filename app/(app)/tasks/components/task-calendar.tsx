"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { es } from 'date-fns/locale';

type TaskCalendarProps = {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  highlightedDates: Date[];
};

export function TaskCalendar({ selectedDate, onDateSelect, highlightedDates }: TaskCalendarProps) {
  
  return (
    <div className="flex justify-center">
        <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            className="rounded-md border"
            modifiers={{ tasks: highlightedDates }}
            modifiersStyles={{
                tasks: {
                  border: '2px solid hsl(var(--primary))',
                  borderRadius: '50%',
                },
            }}
            locale={es}
            captionLayout="dropdown-buttons"
            fromYear={new Date().getFullYear() - 5}
            toYear={new Date().getFullYear() + 5}
        />
    </div>
  );
}
