'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AddFuncionarioDialog } from './add-funcionario-dialog';

interface ComboboxFieldProps {
  control: any;
  name: any;
  label: string;
  options: { label: string; value: string; rut?: string; id: string; }[];
  placeholder?: string;
  emptyMessage?: string;
  onValueChange: (value: string) => void;
  showAddButton?: boolean;
}

export const ComboboxField = ({
  control,
  name,
  label,
  options,
  placeholder,
  emptyMessage,
  onValueChange,
  showAddButton = false,
}: ComboboxFieldProps) => {
  const [open, setOpen] = useState(false);
  const [showAddFuncionario, setShowAddFuncionario] = useState(false);

  return (
    <>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'w-full justify-between',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    <span className="truncate">
                      {field.value
                        ? options?.find(
                            (option) =>
                              option.value.toLowerCase() ===
                              field.value.toLowerCase()
                          )?.label ?? field.value
                        : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder={placeholder}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2 text-sm text-center">
                        {emptyMessage}
                        {showAddButton && (
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => {
                              setOpen(false);
                              setShowAddFuncionario(true);
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" /> Añadir nuevo
                            funcionario
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {options?.map((option) => (
                        <CommandItem
                          value={option.label}
                          key={option.id}
                          onSelect={() => {
                            onValueChange(option.value);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              field.value?.toLowerCase() ===
                                option.value.toLowerCase()
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      {showAddFuncionario && <AddFuncionarioDialog />}
    </>
  );
};
