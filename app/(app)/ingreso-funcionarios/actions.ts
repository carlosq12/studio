'use server';

import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { sendFuncionarioInfo } from '@/ai/flows/send-funcionario-info';
import type { IngresoFuncionario } from '@/lib/types';

const app = getApps().find(app => app.name === 'server-actions-ingreso') || initializeApp(firebaseConfig, 'server-actions-ingreso');
const db = getFirestore(app);

const funcionarioSchema = z.object({
  FECHA_DE_INGRESO: z.date().optional().nullable(),
  RUT: z.string().min(1, 'RUT es requerido.'),
  NOMBRES: z.string().optional(),
  'APELLIDO P': z.string().optional(),
  'APELLIDO M': z.string().optional(),
  TELEFONO: z.string().optional(),
  FECHA_DE_NACIMIENTO: z.date().optional().nullable(),
  LUGAR_NACIMIENTO: z.string().optional(),
  DIRECCION: z.string().optional(),
  CORREO: z.string().email('Correo no es válido.').optional().or(z.literal('')),
  AFP: z.string().optional(),
  SALUD: z.string().optional(),
  BANCO: z.string().optional(),
  TIPO_DE_CUENTA: z.string().optional(),
  N_CUENTA: z.string().optional(),
  NOMBRE_ISAPRE: z.string().optional(),
  ESTADO: z.string().optional(),
  N_RELOJ_CONTROL: z.string().optional(),
  CARGO: z.string().optional(),
  ESTADO_CIVIL: z.string().optional(),
  fecha_aviso: z.date().optional().nullable(),
});

const funcionarioUpdateSchema = funcionarioSchema.extend({
    id: z.string().min(1, 'El ID es requerido.'),
});

export async function addFuncionario(data: { [key: string]: FormDataEntryValue }) {
  const rawData = {
    ...data,
    FECHA_DE_INGRESO: data.FECHA_DE_INGRESO ? new Date(data.FECHA_DE_INGRESO as string) : null,
    FECHA_DE_NACIMIENTO: data.FECHA_DE_NACIMIENTO ? new Date(data.FECHA_DE_NACIMIENTO as string) : null,
  }

  const validation = funcionarioSchema.safeParse(rawData);
  if (!validation.success) return { error: 'Datos de funcionario inválidos.' };
  
  const funcionarioData = {
    ...validation.data,
    FECHA_DE_INGRESO: validation.data.FECHA_DE_INGRESO ? Timestamp.fromDate(validation.data.FECHA_DE_INGRESO) : null,
    FECHA_DE_NACIMIENTO: validation.data.FECHA_DE_NACIMIENTO ? Timestamp.fromDate(validation.data.FECHA_DE_NACIMIENTO) : null,
    fecha_aviso: null,
  };

  try {
    const docRef = await addDoc(collection(db, 'INGRESO_FUNCIONARIOS'), funcionarioData);
    
    const recipientsSnap = await getDocs(collection(db, 'notification_recipients'));
    const recipientEmails = recipientsSnap.docs.map(doc => doc.data().email).filter(Boolean);

    let emailError = null;
    if (recipientEmails.length > 0) {
        try {
            await sendFuncionarioInfo({
                to: recipientEmails,
                nombre: funcionarioData.NOMBRES || '',
                apellidoPaterno: funcionarioData['APELLIDO P'] || '',
                apellidoMaterno: funcionarioData['APELLIDO M'] || '',
                rut: funcionarioData.RUT,
                telefono: funcionarioData.TELEFONO || 'N/A',
                correo: funcionarioData.CORREO || 'N/A',
                banco: funcionarioData.BANCO || 'N/A',
                tipoCuenta: funcionarioData.TIPO_DE_CUENTA || 'N/A',
                numeroCuenta: funcionarioData.N_CUENTA || 'N/A',
            });
            await updateDoc(docRef, { fecha_aviso: Timestamp.now() });
        } catch (e: any) {
            console.error('Error al enviar correo automático:', e);
            emailError = "El funcionario se guardó, pero el correo falló: " + e.message;
        }
    }

    return { success: true, id: docRef.id, warning: emailError };
  } catch (error: any) {
    return { error: 'No se pudo añadir el funcionario.' };
  }
}

export async function updateFuncionario(data: { [key: string]: FormDataEntryValue }) {
    const rawData = {
        ...data,
        FECHA_DE_INGRESO: data.FECHA_DE_INGRESO ? new Date(data.FECHA_DE_INGRESO as string) : null,
        FECHA_DE_NACIMIENTO: data.FECHA_DE_NACIMIENTO ? new Date(data.FECHA_DE_NACIMIENTO as string) : null,
    };
    
    const validation = funcionarioUpdateSchema.safeParse(rawData);
    if (!validation.success) return { error: 'Datos de funcionario inválidos.' };

    const { id, ...funcionarioData } = validation.data;
    const docRef = doc(db, 'INGRESO_FUNCIONARIOS', id);

    const dataToUpdate = {
        ...funcionarioData,
        FECHA_DE_INGRESO: validation.data.FECHA_DE_INGRESO ? Timestamp.fromDate(validation.data.FECHA_DE_INGRESO) : null,
        FECHA_DE_NACIMIENTO: validation.data.FECHA_DE_NACIMIENTO ? Timestamp.fromDate(validation.data.FECHA_DE_NACIMIENTO) : null,
    };

    try {
        await updateDoc(docRef, dataToUpdate);
        return { success: true };
    } catch (error: any) {
        return { error: 'No se pudo actualizar el funcionario.' };
    }
}

export async function deleteFuncionario(funcionarioId: string) {
    if (!funcionarioId) return { error: 'ID de funcionario no válido.' };
    try {
        await deleteDoc(doc(db, 'INGRESO_FUNCIONARIOS', funcionarioId));
        return { success: true };
    } catch (error: any) {
        return { error: 'No se pudo eliminar el funcionario.' };
    }
}

export async function addMultipleFuncionarios(funcionarios: any[]) {
    const batch = writeBatch(db);
    funcionarios.forEach(data => {
        const docRef = doc(collection(db, 'INGRESO_FUNCIONARIOS'));
        batch.set(docRef, {
          ...data,
          FECHA_DE_INGRESO: data.FECHA_DE_INGRESO ? Timestamp.fromDate(new Date(data.FECHA_DE_INGRESO)) : null,
          FECHA_DE_NACIMIENTO: data.FECHA_DE_NACIMIENTO ? Timestamp.fromDate(new Date(data.FECHA_DE_NACIMIENTO)) : null,
          fecha_aviso: null,
        });
    });
    try {
        await batch.commit();
        return { success: true, count: funcionarios.length };
    } catch (error: any) {
        return { error: 'No se pudieron añadir los funcionarios.' };
    }
}

export async function sendFuncionarioInfoEmail(funcionario: IngresoFuncionario, targetEmails: string[]) {
    if (targetEmails.length === 0) return { error: 'Se requiere al menos un correo electrónico.' };
    if (!funcionario) return { error: 'No se han proporcionado datos del funcionario.' };

    try {
        await sendFuncionarioInfo({
            to: targetEmails,
            nombre: funcionario.NOMBRES || '',
            apellidoPaterno: funcionario['APELLIDO P'] || '',
            apellidoMaterno: funcionario['APELLIDO M'] || '',
            rut: funcionario.RUT,
            telefono: funcionario.TELEFONO || 'N/A',
            correo: funcionario.CORREO || 'N/A',
            banco: funcionario.BANCO || 'N/A',
            tipoCuenta: funcionario.TIPO_DE_CUENTA || 'N/A',
            numeroCuenta: funcionario.N_CUENTA || 'N/A',
        });

        if (funcionario.id) {
            await updateDoc(doc(db, 'INGRESO_FUNCIONARIOS', funcionario.id), { fecha_aviso: Timestamp.now() });
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error al enviar correo manual:', error);
        return { error: error.message || 'No se pudo enviar el correo.' };
    }
}
