// next.js 14+ maneja .env automáticamente, eliminamos dotenv para evitar errores de tipo en build

import '@/ai/flows/suggest-task-improvements.ts';
import '@/ai/flows/summarize-employee-data.ts';
import '@/ai/flows/send-email.ts';
import '@/ai/flows/send-birthday-email.ts';
import '@/ai/flows/send-task-notification.ts';
import '@/ai/flows/send-funcionario-info.ts';
import '@/ai/flows/send-efemeride-notification.ts';
