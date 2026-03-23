
'use server';

import { sendEmail } from '@/ai/flows/send-email';
import { z } from 'zod';

const emailSchema = z.string().email({ message: "Por favor, introduce una dirección de correo válida." });

export async function sendTestEmail(toEmail: string) {
  const validation = emailSchema.safeParse(toEmail);
  if (!validation.success) {
    return { error: validation.error.flatten().formErrors[0] };
  }

  try {
    await sendEmail({
      to: validation.data,
      subject: 'Correo de Prueba desde Personal Hub',
      htmlContent: `
        <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; line-height: 1.5;">
          <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
            <tr>
              <td style="background-color: #008080; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">Correo de Prueba</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px 20px; background-color: #f9f9f9;">
                <h2 style="font-size: 20px; margin-top: 0;">¡Esto es una prueba!</h2>
                <p>Si estás recibiendo este correo, la integración con Brevo para enviar notificaciones está funcionando correctamente.</p>
                <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-top: 20px; text-align: center;">
                  <p style="font-size: 18px; margin: 0; color: #008080;"><strong>¡Configuración Exitosa!</strong></p>
                </div>
                <p style="margin-top: 30px;">¡Buen trabajo!</p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                <p style="margin: 0;">Centro de Gestión de Personal</p>
                <p style="margin: 0;">Hospital de Curepto</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error al enviar correo de prueba:', error);
    return { error: error.message || 'No se pudo enviar el correo de prueba.' };
  }
}
