'use server';
/**
 * @fileOverview Envía un recordatorio de tarea por correo electrónico.
 *
 * - sendTaskNotification - Una función para enviar el correo.
 * - SendTaskNotificationInput - El tipo de entrada para la función.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from './send-email';

const SendTaskNotificationInputSchema = z.object({
  to: z.string().email().describe('La dirección de correo del destinatario.'),
  taskName: z.string().describe('El nombre de la tarea.'),
  personName: z.string().describe('El nombre de la persona asignada.'),
  deadlineDate: z.string().describe('La fecha de vencimiento de la tarea (ej. "25 de Diciembre, 2024").'),
  deadlineTime: z.string().describe('La hora de vencimiento de la tarea (ej. "14:30").'),
  priority: z.string().describe('La prioridad de la tarea (Alta, Media, Baja).'),
});
export type SendTaskNotificationInput = z.infer<
  typeof SendTaskNotificationInputSchema
>;

export async function sendTaskNotification(
  input: SendTaskNotificationInput
): Promise<void> {
  return sendTaskNotificationFlow(input);
}

const sendTaskNotificationFlow = ai.defineFlow(
  {
    name: 'sendTaskNotificationFlow',
    inputSchema: SendTaskNotificationInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, taskName, personName, deadlineDate, deadlineTime, priority } = input;
    
    const subject = `🔔 Recordatorio de Tarea: ${taskName}`;
    
    const priorityColors: Record<string, { bg: string, text: string }> = {
      'Alta': { bg: '#fee2e2', text: '#b91c1c'},
      'Media': { bg: '#ffedd5', text: '#c2410c'},
      'Baja': { bg: '#dbeafe', text: '#1d4ed8'},
    }
    
    const color = priorityColors[priority] || priorityColors['Media'];

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
          body {
            font-family: 'Roboto', Arial, sans-serif;
            background-color: #f4f4f9;
            color: #333333;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            overflow: hidden;
            border-left: 5px solid ${color.text};
          }
          .header {
            padding: 24px;
            border-bottom: 1px solid #eeeeee;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            color: #111827;
          }
          .content {
            padding: 24px;
          }
          .content p {
            line-height: 1.6;
            margin: 0 0 16px;
          }
          .task-details {
            background-color: #f9fafb;
            border-radius: 6px;
            padding: 20px;
            margin-top: 20px;
          }
          .detail-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
          }
          .detail-item strong {
            font-weight: 700;
            color: #4b5563;
            width: 120px;
          }
          .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 12px;
            background-color: ${color.bg};
            color: ${color.text};
          }
          .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            background-color: #f9fafb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Recordatorio de Tarea</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${personName}</strong>,</p>
            <p>Este es un recordatorio amistoso sobre tu próxima tarea. ¡No olvides completarla a tiempo!</p>
            
            <div class="task-details">
              <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #111827;">${taskName}</h2>
              <div class="detail-item">
                <strong>Vencimiento:</strong>
                <span>${deadlineDate} a las ${deadlineTime}</span>
              </div>
              <div class="detail-item">
                <strong>Prioridad:</strong>
                <span class="priority-badge">${priority}</span>
              </div>
            </div>
            
            <p style="margin-top: 24px;">¡Gracias por tu dedicación y esfuerzo!</p>
          </div>
          <div class="footer">
            <p>Equipo Hospital de Curepto</p>
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
