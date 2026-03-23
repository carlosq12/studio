'use server';
/**
 * @fileOverview Envía un correo con la información de un funcionario.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from './send-email';

const SendFuncionarioInfoInputSchema = z.object({
  to: z.array(z.string().email()),
  nombre: z.string(),
  apellidoPaterno: z.string(),
  apellidoMaterno: z.string(),
  rut: z.string(),
  telefono: z.string(),
  correo: z.string(),
  banco: z.string(),
  tipoCuenta: z.string(),
  numeroCuenta: z.string(),
});

export type SendFuncionarioInfoInput = z.infer<
  typeof SendFuncionarioInfoInputSchema
>;

export async function sendFuncionarioInfo(
  input: SendFuncionarioInfoInput
): Promise<void> {
  return sendFuncionarioInfoFlow(input);
}

const sendFuncionarioInfoFlow = ai.defineFlow(
  {
    name: 'sendFuncionarioInfoFlow',
    inputSchema: SendFuncionarioInfoInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { to, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, correo, banco, tipoCuenta, numeroCuenta } = input;
    
    const subject = `Información del Funcionario: ${nombre} ${apellidoPaterno}`;
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
            border-left: 5px solid #008080;
          }
          .header {
            padding: 24px;
            border-bottom: 1px solid #eeeeee;
            background-color: #f9fafb;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            color: #111827;
          }
          .content {
            padding: 24px;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .detail-item {
            padding-bottom: 8px;
            border-bottom: 1px solid #f0f0f0;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-item strong {
            font-weight: 700;
            color: #4b5563;
            display: block;
            margin-bottom: 4px;
            font-size: 14px;
          }
           .detail-item span {
            font-size: 16px;
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
            <h1>Información de Funcionario</h1>
          </div>
          <div class="content">
            <div class="detail-grid">
              <div class="detail-item">
                <strong>Nombre Completo:</strong>
                <span>${nombre} ${apellidoPaterno} ${apellidoMaterno}</span>
              </div>
              <div class="detail-item">
                <strong>RUT:</strong>
                <span>${rut}</span>
              </div>
              <div class="detail-item">
                <strong>Teléfono:</strong>
                <span>${telefono}</span>
              </div>
              <div class="detail-item">
                <strong>Correo Personal:</strong>
                <span>${correo}</span>
              </div>
              <div class="detail-item">
                <strong>Banco:</strong>
                <span>${banco}</span>
              </div>
              <div class="detail-item">
                <strong>Tipo de Cuenta:</strong>
                <span>${tipoCuenta}</span>
              </div>
              <div class="detail-item">
                <strong>Número de Cuenta:</strong>
                <span>${numeroCuenta}</span>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>Correo enviado desde Personal Hub - Hospital de Curepto</p>
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
