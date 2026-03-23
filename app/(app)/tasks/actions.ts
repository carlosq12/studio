'use server';

import { collection, doc, addDoc, deleteDoc, updateDoc, getDocs, query, where, Timestamp, writeBatch, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sendEfemerideNotification } from '@/ai/flows/send-efemeride-notification';

const app = getApps().find(app => app.name === 'server-actions-tasks') || initializeApp(firebaseConfig, 'server-actions-tasks');
const db = getFirestore(app);

const taskSchema = z.object({
  'nombre tarea': z.string().min(1, 'El nombre de la tarea es requerido.'),
  descripcion: z.string().optional(),
  persona: z.array(z.string()).min(1, 'Se debe asignar al menos una persona.'),
  lugar: z.string().optional(),
  estado: z.enum(['Pendiente', 'En Progreso', 'Completada', 'Atrasada']),
  prioridad: z.enum(['Alta', 'Media', 'Baja']),
  correo: z.string().optional(),
  tipo_tarea: z.enum(['Día Único', 'Semanal', 'Mensual', 'Anual']),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  hora: z.string().optional(),
  meses_seleccionados: z.array(z.string()).optional(),
  dia_inicio_mensual: z.coerce.number().optional().nullable(),
  dia_fin_mensual: z.coerce.number().optional().nullable(),
  mes_anual: z.string().optional(),
  color: z.string().optional(),
});

type TaskData = z.infer<typeof taskSchema>;

const taskUpdateSchema = taskSchema.extend({
  id: z.string().min(1, 'El ID de la tarea es requerido.'),
});

export async function addTask(data: TaskData) {
  const validation = taskSchema.safeParse(data);
  if (!validation.success) return { error: 'Datos inválidos.' };
  
  try {
    await addDoc(collection(db, 'tareas'), validation.data);
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al añadir tarea.' };
  }
}

export async function updateTask(data: z.infer<typeof taskUpdateSchema>) {
  const validation = taskUpdateSchema.safeParse(data);
  if (!validation.success) return { error: 'Datos inválidos.' };

  const { id, ...taskData } = validation.data;
  const docRef = doc(db, 'tareas', id);
  try {
    await updateDoc(docRef, taskData);
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al actualizar tarea.' };
  }
}

export async function deleteTask(taskId: string) {
  const docRef = doc(db, 'tareas', taskId);
  try {
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al eliminar tarea.' };
  }
}

const efemerideSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.'),
  dia: z.coerce.number().min(1).max(31),
  mes: z.string().min(1, 'El mes es requerido.'),
  encargados: z.array(z.string()),
  funcionarios_afectos: z.array(z.string()),
});

type EfemerideData = z.infer<typeof efemerideSchema>;

const efemerideUpdateSchema = efemerideSchema.extend({
  id: z.string().min(1, 'El ID es requerido.'),
});

export async function addEfemeride(data: EfemerideData) {
  const validation = efemerideSchema.safeParse(data);
  if (!validation.success) return { error: 'Datos inválidos.' };
  try {
    await addDoc(collection(db, 'efemerides'), validation.data);
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al añadir efeméride.' };
  }
}

export async function updateEfemeride(data: z.infer<typeof efemerideUpdateSchema>) {
  const validation = efemerideUpdateSchema.safeParse(data);
  if (!validation.success) return { error: 'Datos inválidos.' };
  const { id, ...efemerideData } = validation.data;
  try {
    await updateDoc(doc(db, 'efemerides', id), efemerideData);
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al actualizar.' };
  }
}

export async function deleteEfemeride(id: string) {
  try {
    await deleteDoc(doc(db, 'efemerides', id));
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al eliminar.' };
  }
}

export async function clearEfemerideNotificationLogs(efemerideId: string, target: 'encargados' | 'afectos') {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const occurrencePrefix = `${currentYear}-`;

        const logsQuery = query(
            collection(db, 'efemeride_notification_logs'),
            where('efemerideId', '==', efemerideId)
        );
        const logSnap = await getDocs(logsQuery);
        
        const batch = writeBatch(db);
        let deletedCount = 0;

        logSnap.docs.forEach(logDoc => {
            const logData = logDoc.data();
            const type = logData.type || '';
            const date = logData.date || '';
            
            if (date.startsWith(occurrencePrefix) && type.includes(target)) {
                batch.delete(logDoc.ref);
                deletedCount++;
            }
        });

        if (deletedCount > 0) {
            await batch.commit();
        }

        return { success: true, count: deletedCount };
    } catch (error: any) {
        console.error('Error al limpiar logs de efeméride:', error);
        return { error: 'Error al reiniciar notificaciones: ' + error.message };
    }
}

async function notifyGroup(efemeride: any, groupIds: string[], funcionariosMap: Map<string, any>, occurrenceKey: string, type: string, daysLeft: number, mesNombre: string, diaNumero: number) {
    if (!groupIds || groupIds.length === 0) return false;

    // Filtro manual para evitar el error de índice
    const logsQuery = query(
        collection(db, 'efemeride_notification_logs'),
        where('efemerideId', '==', efemeride.id)
    );
    const logSnap = await getDocs(logsQuery);

    const alreadyNotified = logSnap.docs.some(logDoc => {
        const logData = logDoc.data();
        return logData.date === occurrenceKey && logData.type === type;
    });

    if (alreadyNotified) return false;

    let successAtLeastOne = false;
    for (const personId of groupIds) {
        const person = funcionariosMap.get(personId);
        if (person?.email) {
            try {
                await sendEfemerideNotification({
                    to: person.email,
                    efemerideName: efemeride.nombre,
                    daysLeft,
                    date: daysLeft === 0 ? 'Hoy' : `${diaNumero} de ${mesNombre}`,
                    encargadoName: person.name
                });
                successAtLeastOne = true;
            } catch (e) {
                console.error(`Error enviando correo a ${person.email}:`, e);
            }
        }
    }

    if (successAtLeastOne) {
        await addDoc(collection(db, 'efemeride_notification_logs'), {
            efemerideId: efemeride.id,
            date: occurrenceKey,
            type: type,
            sentAt: Timestamp.now()
        });
    }
    return successAtLeastOne;
}

export async function checkAndSendEfemerideNotifications() {
    try {
        const efemeridesSnap = await getDocs(collection(db, 'efemerides'));
        const efemerides = efemeridesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const funcionariosSnap = await getDocs(collection(db, 'INGRESO_FUNCIONARIOS'));
        const funcionariosMap = new Map(funcionariosSnap.docs.map(doc => {
            const data = doc.data();
            const fullName = `${data.NOMBRES || ''} ${data['APELLIDO P'] || ''}`.trim();
            return [doc.id, { name: fullName, email: data.CORREO }];
        }));

        const now = new Date();
        const currentYear = now.getFullYear();
        
        const datesToCheck = [
            { date: now, daysLeft: 0 },
            { date: addDays(now, 1), daysLeft: 1 },
            { date: addDays(now, 2), daysLeft: 2 }
        ];

        let sentCount = 0;

        for (const efemeride of efemerides) {
            for (const { date, daysLeft } of datesToCheck) {
                const mesNombre = format(date, 'MMMM', { locale: es });
                const diaNumero = date.getDate();

                if (efemeride.mes.toLowerCase() === mesNombre.toLowerCase() && efemeride.dia === diaNumero) {
                    const occurrenceKey = `${currentYear}-${efemeride.mes}-${efemeride.dia}`;
                    
                    const notifiedEncargados = await notifyGroup(
                        efemeride, 
                        efemeride.encargados || [], 
                        funcionariosMap, 
                        occurrenceKey, 
                        `encargados-${daysLeft}-days`, 
                        daysLeft, 
                        mesNombre, 
                        diaNumero
                    );
                    if (notifiedEncargados) sentCount++;

                    // Los funcionarios afectos SOLO se notifican el día 0
                    if (daysLeft === 0) {
                        const notifiedAfectos = await notifyGroup(
                            efemeride, 
                            efemeride.funcionarios_afectos || [], 
                            funcionariosMap, 
                            occurrenceKey, 
                            `afectos-0-days`, 
                            0, 
                            mesNombre, 
                            diaNumero
                        );
                        if (notifiedAfectos) sentCount++;
                    }
                }
            }
        }

        return { success: true, count: sentCount };
    } catch (error: any) {
        console.error('Error al procesar avisos de efemérides:', error);
        return { error: 'Error al procesar notificaciones: ' + error.message };
    }
}

export async function manualSendEfemerideNotification(efemerideId: string, target: 'encargados' | 'afectos') {
    try {
        const efemerideDoc = await getDoc(doc(db, 'efemerides', efemerideId));
        if (!efemerideDoc.exists()) throw new Error('Efeméride no encontrada.');
        const efemeride = { id: efemerideDoc.id, ...efemerideDoc.data() } as any;

        const funcionariosSnap = await getDocs(collection(db, 'INGRESO_FUNCIONARIOS'));
        const funcionariosMap = new Map(funcionariosSnap.docs.map(doc => {
            const data = doc.data();
            const fullName = `${data.NOMBRES || ''} ${data['APELLIDO P'] || ''}`.trim();
            return [doc.id, { name: fullName, email: data.CORREO }];
        }));

        const now = new Date();
        const currentYear = now.getFullYear();
        const occurrenceKey = `${currentYear}-${efemeride.mes}-${efemeride.dia}`;
        
        const groupIds = target === 'encargados' ? efemeride.encargados : efemeride.funcionarios_afectos;
        const type = `${target}-manual`;

        let sentCount = 0;
        for (const personId of groupIds) {
            const person = funcionariosMap.get(personId);
            if (person?.email) {
                await sendEfemerideNotification({
                    to: person.email,
                    efemerideName: efemeride.nombre,
                    daysLeft: 0,
                    date: `${efemeride.dia} de ${efemeride.mes}`,
                    encargadoName: person.name
                });
                sentCount++;
            }
        }

        if (sentCount > 0) {
            await addDoc(collection(db, 'efemeride_notification_logs'), {
                efemerideId: efemeride.id,
                date: occurrenceKey,
                type: type,
                sentAt: Timestamp.now()
            });
        }

        return { success: true, count: sentCount };
    } catch (error: any) {
        console.error('Error en envío manual:', error);
        return { error: error.message };
    }
}
