'use server';
/**
 * @fileOverview Envía un correo de felicitación de cumpleaños.
 *
 * - sendBirthdayEmail - Una función para enviar el correo de cumpleaños.
 * - SendBirthdayEmailInput - El tipo de entrada para la función sendBirthdayEmail.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from './send-email-v2';

const SendBirthdayEmailInputSchema = z.object({
  to: z.string().email().describe('La dirección de correo del destinatario.'),
  name: z.string().describe('El nombre de la persona que cumple años.'),
});
export type SendBirthdayEmailInput = z.infer<
  typeof SendBirthdayEmailInputSchema
>;

export async function sendBirthdayEmail(
  input: SendBirthdayEmailInput
): Promise<void> {
  return sendBirthdayEmailFlow(input);
}

const sendBirthdayEmailFlow = ai.defineFlow(
  {
    name: 'sendBirthdayEmailFlow',
    inputSchema: SendBirthdayEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, name } = input;
    
    const subject = `🎂 ¡Feliz Cumpleaños, ${name}!`;
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Roboto:wght@400;700&display=swap');
          body, table, td, div, p, a {
            font-family: 'Roboto', Arial, sans-serif;
            font-size: 16px;
            color: #333333;
          }
          .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .header {
            background-image: linear-gradient(135deg, #6a82fb, #d470a7, #a26cf5);
            padding: 40px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-family: 'Montserrat', sans-serif;
            font-size: 36px;
            font-weight: 700;
            color: white;
          }
           .header p {
            margin: 5px 0 0;
            font-family: 'Montserrat', sans-serif;
            font-size: 24px;
            color: rgba(255, 255, 255, 0.9);
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .content p {
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .quote {
            background-color: #f0f7f7;
            border-radius: 8px;
            padding: 15px;
            border: 1px solid #d4eeee;
            margin: 30px auto;
            max-width: 80%;
            text-align: left;
          }
          .quote p {
            margin: 0;
            font-style: italic;
            color: #555;
          }
          .footer {
            background-image: linear-gradient(135deg, #6a82fb, #d470a7, #a26cf5);
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
          }
          .footer p {
              color: rgba(255, 255, 255, 0.9);
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f0f2f5;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 20px;">
          <tr>
            <td>
              <table role="presentation" class="container" border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td class="header">
                    <h1>🎈 ¡Feliz Cumpleaños! 🎈</h1>
                    <p>${name} 🎉</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <p>Queremos enviarte un afectuoso saludo de parte de todo el equipo del <strong>Hospital de Curepto</strong> 🏥💙.</p>
                    
                    <div class="quote">
                      <p>"Tu dedicación y compromiso 🤝💪 son parte fundamental de nuestra misión de cuidar a la comunidad ❤️🌟."</p>
                    </div>

                    <p>¡Que tengas un día lleno de reconocimiento 👏, alegría 😄 y buenas energías! 🌈🙌</p>
                    
                    <p style="font-weight: bold; margin-top: 30px;">¡Disfruta mucho y recibe un gran abrazo de todo el equipo!</p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p style="margin: 0; font-weight: bold;">Con cariño, ✨</p>
                    <p style="margin: 5px 0 0;">Equipo Hospital de Curepto</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
