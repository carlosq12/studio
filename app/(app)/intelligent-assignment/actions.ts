'use server';

import { suggestTaskImprovements } from '@/ai/flows/suggest-task-improvements';
import type { SuggestTaskImprovementsInput } from '@/ai/flows/suggest-task-improvements';
import { z } from 'zod';

const actionSchema = z.object({
  tasks: z.array(
    z.object({
      taskId: z.string(),
      taskDescription: z.string(),
      assignedEmployee: z.string(),
      deadline: z.string(),
      priority: z.enum(['Alta', 'Media', 'Baja']),
    })
  ),
  employees: z.array(
    z.object({
      employeeId: z.string(),
      skills: z.array(z.string()),
      currentWorkload: z.number(),
      availability: z.string(),
    })
  ),
});


export async function getTaskSuggestions(input: SuggestTaskImprovementsInput) {
  const parsedInput = actionSchema.safeParse(input);

  if (!parsedInput.success) {
    console.error('Validation error in getTaskSuggestions:', parsedInput.error.flatten());
    return { error: 'Formato de entrada inválido.' };
  }

  try {
    const result = await suggestTaskImprovements(parsedInput.data);
    return { suggestions: result.suggestions };
  } catch (error) {
    console.error('Error al obtener sugerencias de tareas:', error);
    return { error: 'No se pudieron obtener sugerencias de la IA.' };
  }
}
