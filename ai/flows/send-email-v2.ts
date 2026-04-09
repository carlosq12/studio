
'use server';
/**
 * @fileOverview Envía un correo electrónico utilizando Gmail (Nodemailer).
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';

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
    name: 'sendEmailFlow_v2',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, subject, htmlContent } = input;

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        throw new Error('Configuración SMTP faltante en el servidor.');
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });

        const mailOptions = {
            from: `"Hospital de Curepto" <${user}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email enviado vía Gmail.`);
    } catch (error: any) {
      console.error('Error Gmail:', error);
      throw new Error(`Error en el envío de correo: ${error.message}`);
    }
  }
);
