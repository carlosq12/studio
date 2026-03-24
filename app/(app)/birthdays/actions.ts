'use server';

import { addDoc, collection, writeBatch, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Timestamp } from 'firebase/firestore';
import { sendBirthdayEmail } from '@/ai/flows/send-birthday-email';

// Initialize Firebase for server-side usage
const app = getApps().find(app => app.name === 'server-actions-birthdays') || initializeApp(firebaseConfig, 'server-actions-birthdays');
const db = getFirestore(app);

const birthdaySchema = z.object({
  'nombre funcionario': z.string().min(1, 'El nombre es requerido.'),
  'fecha nacimiento': z.date({
    required_error: 'La fecha de nacimiento es requerida.',
  }),
  correo: z.string().email('El correo no es válido.').optional().or(z.literal('')),
});

const birthdayUpdateSchema = birthdaySchema.extend({
    id: z.string().min(1, 'El ID es requerido.'),
});

type BirthdayData = z.infer<typeof birthdaySchema>;

export async function addBirthday(data: { [key: string]: FormDataEntryValue }) {
  const rawDate = data['fecha nacimiento'];
  const parsedData = {
    ...data,
    'fecha nacimiento': typeof rawDate === 'string' ? new Date(rawDate) : new Date(),
  }

  const validation = birthdaySchema.safeParse(parsedData);

  if (!validation.success) {
    console.error('Validation Error:', validation.error.flatten());
    return { error: 'Datos de cumpleaños inválidos.' };
  }
  
  const birthdayData = {
    'nombre funcionario': validation.data['nombre funcionario'],
    'fecha nacimiento': Timestamp.fromDate(validation.data['fecha nacimiento']),
    correo: validation.data.correo || '',
    role: '', 
    avatar: `https://avatar.vercel.sh/${validation.data['nombre funcionario']}.png`,
    fecha_aviso: null,
  };

  try {
    await addDoc(collection(db, 'cumpleaños'), birthdayData);
    return { success: true };
  } catch (error: any) {
    console.error('Error adding birthday:', error);
    const permissionError = new FirestorePermissionError({
      path: 'cumpleaños',
      operation: 'create',
      requestResourceData: birthdayData,
    });
    if (errorEmitter) {
      errorEmitter.emit('permission-error', permissionError);
    }
    return { error: 'No se pudo guardar el cumpleaños.' };
  }
}

export async function updateBirthday(data: { [key: string]: FormDataEntryValue }) {
    const rawDate = data['fecha nacimiento'];
    const parsedData = {
        ...data,
        'fecha nacimiento': typeof rawDate === 'string' ? new Date(rawDate) : new Date(),
    }
    const validation = birthdayUpdateSchema.safeParse(parsedData);

    if (!validation.success) {
        console.error('Validation Error:', validation.error.flatten());
        return { error: 'Datos de cumpleaños inválidos.' };
    }

    const { id, ...birthdayData } = validation.data;
    const docRef = doc(db, 'cumpleaños', id);

    const dataToUpdate = {
        'nombre funcionario': birthdayData['nombre funcionario'],
        'fecha nacimiento': Timestamp.fromDate(birthdayData['fecha nacimiento']),
        correo: birthdayData.correo || '',
        avatar: `https://avatar.vercel.sh/${birthdayData['nombre funcionario']}.png`
    };

    try {
        await updateDoc(docRef, dataToUpdate);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating birthday:', error);
        if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        if (errorEmitter) {
            errorEmitter.emit('permission-error', permissionError);
        }
        }
        return { error: error.message || 'No se pudo actualizar el cumpleaños.' };
    }
}

export async function addMultipleBirthdays(birthdays: BirthdayData[]) {
    const batch = writeBatch(db);

    birthdays.forEach(data => {
        const docRef = doc(collection(db, 'cumpleaños'));
        const birthdayData = {
            'nombre funcionario': data['nombre funcionario'],
            'fecha nacimiento': Timestamp.fromDate(new Date(data['fecha nacimiento'])),
            correo: data.correo || '',
            role: '', 
            avatar: `https://avatar.vercel.sh/${data['nombre funcionario']}.png`,
            fecha_aviso: null,
        };
        batch.set(docRef, birthdayData);
    });

    try {
        await batch.commit();
        return { success: true, count: birthdays.length };
    } catch (error: any) {
        console.error('Error al añadir cumpleaños en lote:', error);
        return { error: error.message || 'No se pudieron añadir los cumpleaños.' };
    }
}

export async function deleteBirthday(birthdayId: string) {
  if (!birthdayId) return { error: 'ID de cumpleaños no válido.' };
  try {
    await deleteDoc(doc(db, 'cumpleaños', birthdayId));
    return { success: true };
  } catch (error: any) {
    return { error: 'No se pudo eliminar el cumpleaños.' };
  }
}

export async function manualSendBirthdayEmail(birthdayId: string, name: string, email: string) {
    try {
        await sendBirthdayEmail({ to: email, name: name });
        
        // Registrar el envío en el documento
        if (birthdayId) {
            await updateDoc(doc(db, 'cumpleaños', birthdayId), {
                fecha_aviso: Timestamp.now()
            });
        }
        
        return { success: true };
    } catch (error: any) {
        console.error('Error al enviar correo de cumpleaños:', error);
        return { error: error.message || 'No se pudo enviar el correo de cumpleaños.' };
    }
}

export async function checkAndSendBirthdayNotifications() {
    try {
        const querySnapshot = await getDocs(collection(db, 'cumpleaños'));
        const birthdays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let sentCount = 0;

        for (const birthday of birthdays) {
            const birthDateValue = birthday['fecha nacimiento'];
            if (!birthDateValue || !birthday.correo) continue;

            let birthDate: Date | null = null;
            if (birthDateValue instanceof Timestamp) {
                birthDate = birthDateValue.toDate();
            } else if (typeof birthDateValue === 'string') {
                birthDate = new Date(birthDateValue);
            }

            if (birthDate && birthDate.getDate() === currentDay && birthDate.getMonth() === currentMonth) {
                // Verificar si ya fue notificado hoy
                const lastAviso = birthday.fecha_aviso;
                let alreadyNotified = false;
                if (lastAviso instanceof Timestamp) {
                    const lastAvisoDate = lastAviso.toDate();
                    alreadyNotified = lastAvisoDate.getFullYear() === currentYear && 
                                     lastAvisoDate.getMonth() === currentMonth && 
                                     lastAvisoDate.getDate() === currentDay;
                }

                if (!alreadyNotified) {
                    try {
                        await sendBirthdayEmail({ 
                            to: birthday.correo, 
                            name: birthday['nombre funcionario'] || 'Colega' 
                        });
                        
                        await updateDoc(doc(db, 'cumpleaños', birthday.id), {
                            fecha_aviso: Timestamp.now()
                        });
                        sentCount++;
                    } catch (e) {
                        console.error(`Error enviando correo automático a ${birthday.correo}:`, e);
                    }
                }
            }
        }

        return { success: true, count: sentCount };
    } catch (error: any) {
        console.error('Error al procesar avisos automáticos de cumpleaños:', error);
        return { error: error.message };
    }
}