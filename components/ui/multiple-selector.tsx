'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { XCircle, CheckCircle, ChevronDown, XIcon, WandSparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

const multipleSelectorVariants = cva(
  'flex w-full p-1 bg-background h-auto items-center justify-between rounded-md border border-input text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-background',
        secondary: 'bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface Option {
  value: string;
  label: string;
}

interface MultipleSelectorProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>, VariantProps<typeof multipleSelectorVariants> {
  value: Option[];
  onChange: (value: Option[]) => void;
  options: Option[];
  placeholder?: string;
  emptyIndicator?: React.ReactNode;
}

const MultipleSelector = React.forwardRef<HTMLInputElement, MultipleSelectorProps>(
  ({ value, onChange, options, variant, placeholder, emptyIndicator, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (option: Option) => {
      const isSelected = value.some((v) => v.value === option.value);
      if (isSelected) {
        onChange(value.filter((v) => v.value !== option.value));
      } else {
        onChange([...value, option]);
      }
    };
    
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            ref={ref as any}
            className={cn(
              'flex flex-wrap items-center p-1 min-h-10 rounded-md border border-input bg-background text-sm ring-offset-background',
              { 'cursor-pointer': !props.disabled }
            )}
            onClick={() => !props.disabled && setOpen(true)}
          >
            <div className="flex flex-wrap items-center gap-1.5 flex-grow">
              {value.length > 0 ? (
                value.map((val) => (
                  <Badge
                    key={val.value}
                    variant="secondary"
                    className="flex items-center gap-1.5"
                  >
                    {val.label}
                    <XCircle
                      className="h-4 w-4 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(val);
                      }}
                    />
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground mx-2">{placeholder || 'Select...'}</span>
              )}
            </div>
            <div className="flex items-center">
              {value.length > 0 && (
                <XIcon
                  className="h-4 w-4 cursor-pointer text-muted-foreground mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>{emptyIndicator || 'No results found.'}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option)}
                    className="flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {value.some((v) => v.value === option.value) && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

MultipleSelector.displayName = 'MultipleSelector';

export { MultipleSelector };
