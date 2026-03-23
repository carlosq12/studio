"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Loader2, UserCog, CalendarClock, ArrowRight, WandSparkles } from "lucide-react";
import { employees, tasks as mockTasks } from "@/lib/data";
import { getTaskSuggestions } from '../actions';
import type { SuggestTaskImprovementsOutput } from '@/ai/flows/suggest-task-improvements';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Suggestion = SuggestTaskImprovementsOutput['suggestions'][0];

export default function IntelligentAssignmentClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);

    const input = {
      tasks: mockTasks.map(t => ({
        taskId: t.id,
        taskDescription: t.descripcion || '',
        assignedEmployee: t.persona as string,
        deadline: t.fecha,
        priority: t.prioridad
      })),
      employees: employees.map(e => ({
        employeeId: e.id,
        skills: e.skills || [],
        currentWorkload: e.currentWorkload || 0,
        availability: e.availability || 'No disponible',
      })),
    };

    const result = await getTaskSuggestions(input);
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else if (result.suggestions) {
      setSuggestions(result.suggestions);
      toast({
        title: "¡Sugerencias generadas!",
        description: "La IA ha proporcionado nuevas recomendaciones para la asignación de tareas.",
      });
    }

    setIsLoading(false);
  };
  
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId)
    return employee ? `${employee.firstName} ${employee.paternalLastName}`: 'Desconocido'
  };
  const getTaskName = (taskId: string) => mockTasks.find(t => t.id === taskId)?.name || 'Tarea Desconocida';
  const getOriginalAssignee = (taskId: string) => {
    const task = mockTasks.find(t => t.id === taskId);
    return task ? getEmployeeName(task.persona as string) : 'Desconocido';
  }

  const suggestionTypes: Record<string, string> = {
    reassignment: 'Reasignación',
    'deadline extension': 'Extensión de Plazo',
  };

  const iconMap: Record<string, React.ElementType> = {
    reassignment: UserCog,
    'deadline extension': CalendarClock,
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analizar Asignaciones Actuales</CardTitle>
          <CardDescription>Haz clic en el botón de abajo para usar la IA para analizar las tareas actuales y las cargas de trabajo de los empleados, y luego generar sugerencias para la optimización.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGetSuggestions} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <WandSparkles className="mr-2 h-4 w-4" />
                Generar Sugerencias
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sugerencias Potenciadas por IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.map((suggestion, index) => {
              const improvementType = suggestion.improvementType.toLowerCase();
              const Icon = iconMap[improvementType] || BrainCircuit;
              const isReassignment = improvementType === 'reassignment';
              const suggestionTitle = suggestionTypes[improvementType] || suggestion.improvementType;

              return (
              <Alert key={index}>
                <Icon className="h-4 w-4" />
                <AlertTitle className="capitalize font-headline flex items-center gap-2">
                  {suggestionTitle} para: {getTaskName(suggestion.taskId)}
                </AlertTitle>
                <AlertDescription>
                  <p className="mb-2">{suggestion.reason}</p>
                  {isReassignment && suggestion.recommendedEmployee && (
                    <div className="flex items-center gap-2 text-sm font-semibold p-2 bg-muted rounded-md">
                        <span>{getOriginalAssignee(suggestion.taskId)}</span>
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span className="text-primary">{getEmployeeName(suggestion.recommendedEmployee)}</span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
