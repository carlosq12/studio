'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AddBirthdayDialog } from './components/add-birthday-dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, Firestore, Timestamp } from 'firebase/firestore';
import type { Birthday } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo, useEffect } from 'react';
import { format, getYear, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Cake, Sparkles, CalendarIcon, List, LayoutDashboard } from 'lucide-react';
import { BirthdayPersonCard } from './components/birthday-person-card';
import { BirthdayCalendar } from './components/birthday-calendar';
import { Confetti } from './components/confetti';
import { BulkUploadBirthdaysSheet } from './components/bulk-upload-birthdays-sheet';
import { EditBirthdayDialog } from './components/edit-birthday-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BirthdaysTable from './components/birthdays-table';
import { BirthdayDashboard } from './components/birthday-dashboard';
import { manualSendBirthdayEmail } from './actions';
import { useToast } from '@/hooks/use-toast';

function useBirthdays(db: Firestore | null) {
  const birthdaysQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'cumpleaños'));
  }, [db]);
  const { data: birthdays, loading } = useCollection<Birthday>(birthdaysQuery);

  return { birthdays: birthdays || [], loading };
}

export default function BirthdaysPage() {
  const firestore = useFirestore();
  const { birthdays, loading } = useBirthdays(firestore);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showConfetti, setShowConfetti] = useState(false);
  const [birthdayToEdit, setBirthdayToEdit] = useState<Birthday | null>(null);
  const [activeTab, setActiveTab] = useState('inicio');
  const { toast } = useToast();

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  const birthdaysByDate = useMemo(() => {
    const map = new Map<string, Birthday[]>();
    birthdays.forEach((person) => {
      const birthDateValue = person['fecha nacimiento'];
      if (!birthDateValue) return;

      let parsedDate: Date | null = null;

      if (birthDateValue instanceof Timestamp) {
        parsedDate = birthDateValue.toDate();
      } else if (typeof birthDateValue === 'string') {
        try {
          parsedDate = new Date(birthDateValue);
           if (isNaN(parsedDate.getTime())) {
             parsedDate = null;
           }
        } catch (e) {
          console.warn(`Could not parse date string: ${birthDateValue}`);
        }
      }

      if (parsedDate) {
        const monthDay = format(parsedDate, 'MM-dd');
        if (!map.has(monthDay)) {
          map.set(monthDay, []);
        }
        map.get(monthDay)?.push(person);
      }
    });
    return map;
  }, [birthdays]);

  const birthdayDates = useMemo(() => {
    const currentYear = getYear(selectedDate || new Date());
    return Array.from(birthdaysByDate.keys()).map((md) => {
      const [month, day] = md.split('-').map(Number);
      return new Date(currentYear, month - 1, day);
    });
  }, [birthdaysByDate, selectedDate]);

  const birthdaysOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const selectedMonthDay = format(selectedDate, 'MM-dd');
    return birthdaysByDate.get(selectedMonthDay) || [];
  }, [selectedDate, birthdaysByDate]);

  useEffect(() => {
    if (birthdaysOnSelectedDate.length > 0 && activeTab === 'calendar') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [birthdaysOnSelectedDate, activeTab]);

  const handleSendEmail = async (person: Birthday) => {
    if (!person.correo) return;
    try {
      const result = await manualSendBirthdayEmail({
        name: person['nombre funcionario'] || 'Colega',
        email: person.correo,
      });
      if (result.error) throw new Error(result.error);
      toast({ title: "¡Correo enviado!", description: `Felicidades enviadas a ${person.correo}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 h-full">
      {showConfetti && <Confetti />}
      <PageHeader
        title="Cumpleaños"
        description="Ver los cumpleaños de los empleados y planificar celebraciones."
      >
        <div className="flex items-center gap-2">
            <BulkUploadBirthdaysSheet />
            <AddBirthdayDialog />
        </div>
      </PageHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="self-start mb-4 bg-white p-1 rounded-xl shadow-sm border h-auto flex-wrap">
            <TabsTrigger value="inicio" className="gap-2 rounded-lg py-2 px-4">
                <LayoutDashboard className="h-4 w-4"/> Inicio
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 rounded-lg py-2 px-4">
                <CalendarIcon className="h-4 w-4"/> Calendario
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2 rounded-lg py-2 px-4">
                <List className="h-4 w-4"/> Listado
            </TabsTrigger>
        </TabsList>

        <TabsContent value="inicio" className="flex-1">
            {loading ? (
                <div className="grid gap-6 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="md:col-span-2 h-80" />
                    <Skeleton className="h-80" />
                </div>
            ) : (
                <BirthdayDashboard 
                    birthdays={birthdays} 
                    onViewList={() => setActiveTab('list')}
                    onSendEmail={handleSendEmail}
                />
            )}
        </TabsContent>

        <TabsContent value="calendar" className="flex-1">
            <Card className="border-none shadow-sm">
                <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {loading ? (
                    <div className="flex justify-center items-center">
                        <Skeleton className="h-[370px] w-full max-w-md rounded-md" />
                    </div>
                    ) : (
                    <BirthdayCalendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        highlightedDates={birthdayDates}
                    />
                    )}

                    <div className="border-l border-border md:pl-8 relative">
                    <h2 className="text-xl font-headline font-bold mb-4 flex items-center gap-2">
                        <Cake className="text-primary" />
                        <span>
                        {selectedDate
                            ? `Cumpleaños el ${format(selectedDate, "d 'de' MMMM", {
                                locale: es,
                            })}`
                            : 'Selecciona una fecha'}
                        </span>
                    </h2>
                    {birthdaysOnSelectedDate.length > 0 ? (
                        <div className="space-y-4">
                        {birthdaysOnSelectedDate.map((person) => (
                            <BirthdayPersonCard key={person.id} person={person} onEdit={() => setBirthdayToEdit(person)} />
                        ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full min-h-[200px] gap-4">
                            <Sparkles className="h-16 w-16 text-primary/50" />
                            <p className="text-lg font-medium">
                                {selectedDate ? 'No hay cumpleaños en esta fecha.' : 'Selecciona un día para ver los cumpleaños.'}
                            </p>
                        </div>
                    )}
                    </div>
                </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="list" className="flex-1 flex flex-col">
          <Card className="h-full flex-1 overflow-hidden flex flex-col border-none shadow-sm">
            <BirthdaysTable />
          </Card>
        </TabsContent>
      </Tabs>

      <EditBirthdayDialog 
        birthday={birthdayToEdit}
        open={!!birthdayToEdit}
        onOpenChange={(open) => !open && setBirthdayToEdit(null)}
      />
    </main>
  );
}
