'use server';

import { addDoc, collection, writeBatch, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
    errorEmitter.emit('permission-error', permissionError);
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
        errorEmitter.emit('permission-error', permissionError);
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