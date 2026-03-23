'use server';

/**
 * @fileOverview Provides suggestions for improving task assignments based on employee skills, workload, and upcoming deadlines.
 *
 * - suggestTaskImprovements - A function that suggests improvements for task assignments.
 * - SuggestTaskImprovementsInput - The input type for the suggestTaskImprovements function.
 * - SuggestTaskImprovementsOutput - The return type for the suggestTaskImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskImprovementsInputSchema = z.object({
  tasks: z.array(
    z.object({
      taskId: z.string().describe('Identificador único de la tarea.'),
      taskDescription: z.string().describe('Descripción detallada de la tarea.'),
      assignedEmployee: z.string().describe('El empleado actualmente asignado a la tarea.'),
      deadline: z.string().describe('La fecha límite para la tarea (formato ISO).'),
      priority: z.enum(['Alta', 'Media', 'Baja']).describe('La prioridad de la tarea.'),
    })
  ).describe('Lista de tareas para analizar oportunidades de mejora.'),
  employees: z.array(
    z.object({
      employeeId: z.string().describe('Identificador único del empleado.'),
      skills: z.array(z.string()).describe('Lista de habilidades que posee el empleado.'),
      currentWorkload: z
        .number()
        .describe('La carga de trabajo actual del empleado (p. ej., número de tareas, horas).'),
      availability: z.string().describe('La disponibilidad del empleado (p. ej., tiempo completo, medio tiempo).'),
    })
  ).describe('Lista de empleados y sus atributos.'),
});

export type SuggestTaskImprovementsInput = z.infer<typeof SuggestTaskImprovementsInputSchema>;

const SuggestTaskImprovementsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      taskId: z.string().describe('El ID de la tarea a la que se aplica la sugerencia.'),
      improvementType: z
        .string()
        .describe(
          'Tipo de sugerencia de mejora (p. ej., reasignación, ajuste de carga de trabajo, extensión de plazo).' 
        ),
      reason: z.string().describe('La justificación de la sugerencia.'),
      recommendedEmployee: z
        .string()
        .optional()
        .describe('El empleado recomendado para la reasignación de la tarea, si aplica.'),
    })
  ).describe('Una lista de sugerencias para mejorar las asignaciones de tareas.'),
});

export type SuggestTaskImprovementsOutput = z.infer<typeof SuggestTaskImprovementsOutputSchema>;

export async function suggestTaskImprovements(
  input: SuggestTaskImprovementsInput
): Promise<SuggestTaskImprovementsOutput> {
  return suggestTaskImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskImprovementsPrompt',
  input: {schema: SuggestTaskImprovementsInputSchema},
  output: {schema: SuggestTaskImprovementsOutputSchema},
  prompt: `Eres un asistente de IA diseñado para proporcionar sugerencias para mejorar la asignación de tareas.

  Analiza las tareas y los datos de los empleados proporcionados, y sugiere mejoras en las asignaciones de tareas basadas en las habilidades de los empleados, la carga de trabajo y los plazos próximos. Considera lo siguiente:

  - Coincidencia de habilidades: Asegúrate de que las tareas se asignen a empleados con las habilidades adecuadas.
  - Equilibrio de la carga de trabajo: Distribuye las tareas de manera uniforme entre los empleados para evitar sobrecargar a las personas.
  - Gestión de plazos: Prioriza las tareas con plazos próximos y asigna los recursos en consecuencia.

  Tareas:
  {{#each tasks}}
  - ID de Tarea: {{taskId}}
    Descripción: {{taskDescription}}
    Empleado Asignado: {{assignedEmployee}}
    Plazo: {{deadline}}
    Prioridad: {{priority}}
  {{/each}}

  Empleados:
  {{#each employees}}
  - ID de Empleado: {{employeeId}}
    Habilidades: {{skills}}
    Carga de Trabajo Actual: {{currentWorkload}}
    Disponibilidad: {{availability}}
  {{/each}}

  Proporciona sugerencias específicas para la mejora, incluido el ID de la tarea, el tipo de mejora (p. ej., reasignación, ajuste de carga de trabajo, extensión de plazo), la justificación de la sugerencia y el empleado recomendado para la reasignación de la tarea (si corresponde).

  Formatea tu salida como un objeto JSON que coincida con el siguiente esquema:
  ${JSON.stringify(SuggestTaskImprovementsOutputSchema.describe, null, 2)}`,
});

const suggestTaskImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestTaskImprovementsFlow',
    inputSchema: SuggestTaskImprovementsInputSchema,
    outputSchema: SuggestTaskImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
