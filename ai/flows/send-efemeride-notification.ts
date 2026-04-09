'use server';
/**
 * @fileOverview Envía un recordatorio de efeméride por correo electrónico.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from './send-email-v2';

const SendEfemerideNotificationInputSchema = z.object({
  to: z.string().email().describe('Correo del encargado.'),
  efemerideName: z.string().describe('Nombre del evento.'),
  daysLeft: z.number().describe('Días restantes (1 o 2).'),
  date: z.string().describe('Fecha del evento (ej. 15 de Mayo).'),
  encargadoName: z.string().describe('Nombre del encargado.'),
});

export type SendEfemerideNotificationInput = z.infer<
  typeof SendEfemerideNotificationInputSchema
>;

export async function sendEfemerideNotification(
  input: SendEfemerideNotificationInput
): Promise<void> {
  return sendEfemerideNotificationFlow(input);
}

const sendEfemerideNotificationFlow = ai.defineFlow(
  {
    name: 'sendEfemerideNotificationFlow',
    inputSchema: SendEfemerideNotificationInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, efemerideName, daysLeft, date, encargadoName } = input;
    
    const subject = `⏰ Recordatorio: ${efemerideName} (${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} restante)`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background-color: #ec4899; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
          .badge { display: inline-block; padding: 4px 12px; background: #fdf2f8; color: #db2777; border-radius: 9999px; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 24px;">Próxima Efeméride</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${encargadoName}</strong>,</p>
            <p>Este es un recordatorio automático sobre una efeméride bajo tu responsabilidad:</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin:0 0 10px 0; color: #1e293b;">${efemerideName}</h2>
                <p style="margin:0; font-weight: bold;">Fecha: ${date}</p>
                <p style="margin:5px 0 0 0;" class="badge">Faltan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}</p>
            </div>
            <p>Por favor, asegúrate de que todos los preparativos estén en marcha.</p>
          </div>
          <div class="footer">
            <p>Centro de Gestión de Personal - Hospital de Curepto</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject,
      htmlContent,
    });
  }
);
