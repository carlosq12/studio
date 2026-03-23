"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { es } from 'date-fns/locale';

type BirthdayCalendarProps = {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  highlightedDates: Date[];
};

export function BirthdayCalendar({ selectedDate, onDateSelect, highlightedDates }: BirthdayCalendarProps) {
  
  return (
    <div className="flex justify-center">
        <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            className="rounded-md border"
            modifiers={{ birthdays: highlightedDates }}
            modifiersStyles={{
                birthdays: {
                  border: '2px solid hsl(var(--primary))',
                  borderRadius: '50%',
                },
            }}
            locale={es}
            captionLayout="dropdown-buttons"
            fromYear={1950}
            toYear={new Date().getFullYear() + 5}
        />
    </div>
  );
}
