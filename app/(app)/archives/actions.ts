'use server';

import { collection, doc, addDoc, deleteDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const app = getApps().find(app => app.name === 'server-actions-archives') || initializeApp(firebaseConfig, 'server-actions-archives');
const db = getFirestore(app);

const archiveSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  description: z.string().optional(),
  color: z.string().optional(),
  year: z.string().optional(),
});

const archiveUpdateSchema = archiveSchema.extend({
    id: z.string().min(1, 'El ID es requerido.'),
});

export async function addArchive(data: { [key: string]: any }) {
  const validation = archiveSchema.safeParse(data);

  if (!validation.success) {
    console.error('Validation Error:', validation.error.flatten());
    return { error: 'Datos de archivador inválidos.' };
  }

  const archiveData = {
    ...validation.data,
    createdAt: Timestamp.now(),
    color: validation.data.color || 'bg-gray-500'
  };

  try {
    await addDoc(collection(db, 'archivadores'), archiveData);
    return { success: true };
  } catch (error: any) {
    const permissionError = new FirestorePermissionError({
      path: 'archivadores',
      operation: 'create',
      requestResourceData: archiveData,
    });
    if (errorEmitter) {
      errorEmitter.emit('permission-error', permissionError);
    }
    return { error: 'No se pudo crear el archivador.' };
  }
}

export async function updateArchive(data: { [key: string]: any }) {
    const validation = archiveUpdateSchema.safeParse(data);

    if (!validation.success) {
        console.error('Validation Error:', validation.error.flatten());
        return { error: 'Datos de archivador inválidos.' };
    }

    const { id, ...archiveData } = validation.data;
    const docRef = doc(db, 'archivadores', id);
    
    try {
        await updateDoc(docRef, archiveData);
        return { success: true };
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: archiveData,
            });
            if (errorEmitter) {
                errorEmitter.emit('permission-error', permissionError);
            }
        }
        return { error: 'No se pudo actualizar el archivador.' };
    }
}


export async function deleteArchive(archiveId: string) {
  if (!archiveId) {
    return { error: 'ID de archivador no válido.' };
  }
  const docRef = doc(db, 'archivadores', archiveId);
  try {
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
    }
    return { error: 'No se pudo eliminar el archivador.' };
  }
}

export async function archiveReplacement(replacementId: string, archivadorId: string) {
  if (!replacementId || !archivadorId) {
    return { error: 'ID de solicitud o archivador no válido.' };
  }

  const replacementRef = doc(db, 'reemplazos', replacementId);

  try {
    await updateDoc(replacementRef, { archivadorId });
    return { success: true };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: replacementRef.path,
        operation: 'update',
        requestResourceData: { archivadorId },
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
    }
    return { error: 'No se pudo archivar la solicitud.' };
  }
}

export async function unarchiveReplacements(replacementIds: string[]) {
  if (!replacementIds || replacementIds.length === 0) {
    return { error: 'No se han seleccionado solicitudes para desarchivar.' };
  }

  const batch = writeBatch(db);
  replacementIds.forEach(id => {
    const docRef = doc(db, 'reemplazos', id);
    batch.update(docRef, { archivadorId: '' });
  });

  try {
    await batch.commit();
    return { success: true, count: replacementIds.length };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: 'reemplazos',
        operation: 'update',
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
    }
    return { error: 'No se pudieron desarchivar las solicitudes.' };
  }
}
