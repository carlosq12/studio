
'use server';
/**
 * @fileOverview Envía un correo electrónico utilizando la API de Brevo (Obsoleto).
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendEmailInputSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]).describe('La dirección de correo del destinatario o un array de correos.'),
  subject: z.string().describe('El asunto del correo electrónico.'),
  htmlContent: z.string().describe('El contenido HTML del correo electrónico.'),
});

export async function sendEmail(input: any): Promise<void> {
    throw new Error('Módulo obsoleto. Use v2.');
}
