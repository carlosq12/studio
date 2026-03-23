
'use server';
/**
 * @fileOverview Envía un correo electrónico utilizando la API de Brevo.
 *
 * - sendEmail - Una función para enviar un correo electrónico.
 * - SendEmailInput - El tipo de entrada para la función sendEmail.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendEmailInputSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]).describe('La dirección de correo del destinatario o un array de correos.'),
  subject: z.string().describe('El asunto del correo electrónico.'),
  htmlContent: z.string().describe('El contenido HTML del correo electrónico.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendEmail(input: SendEmailInput): Promise<void> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, subject, htmlContent } = input;

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('La clave de API de Brevo no está configurada.');
      throw new Error('La clave de API de Brevo no está configurada. Por favor, revísala en tu panel.');
    }

    const recipients = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];
    
    const emailData = {
        sender: { name: 'Hospital de Curepto', email: 'hcureptotv@gmail.com' },
        to: recipients,
        subject: subject,
        htmlContent: htmlContent,
    };

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Si el error es específicamente por la IP, lanzamos un mensaje útil
            if (errorData.message?.includes('unrecognised IP')) {
                throw new Error(`Error de Brevo: IP no autorizada (${errorData.message.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || ''}). Debes autorizarla en app.brevo.com/security/authorised_ips`);
            }
            console.error('Error al enviar el correo con Brevo:', errorData);
            throw new Error(errorData.message || response.statusText);
        }

        const responseData = await response.json();
        console.log(`Correo enviado exitosamente a ${Array.isArray(to) ? to.join(', ') : to}.`);

    } catch (error: any) {
      console.error('Error en la llamada fetch para enviar correo:', error);
      throw new Error(error.message || 'No se pudo enviar el correo electrónico.');
    }
  }
);
