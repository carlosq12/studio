
'use server';

import { collection, doc, addDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const app = getApps().find(app => app.name === 'server-actions-inventory-archives') || initializeApp(firebaseConfig, 'server-actions-inventory-archives');
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

export async function addInventoryArchive(data: { [key: string]: FormDataEntryValue }) {
  const validation = archiveSchema.safeParse(data);

  if (!validation.success) {
    console.error('Validation Error:', validation.error.flatten());
    return { error: 'Datos de archivador inválidos.' };
  }

  const archiveData = {
    ...validation.data,
    createdAt: Timestamp.now(),
    color: validation.data.color || 'bg-slate-500'
  };

  try {
    await addDoc(collection(db, 'archivadores_inventario'), archiveData);
    return { success: true };
  } catch (error: any) {
    const permissionError = new FirestorePermissionError({
      path: 'archivadores_inventario',
      operation: 'create',
      requestResourceData: archiveData,
    });
    errorEmitter.emit('permission-error', permissionError);
    return { error: 'No se pudo crear el archivador.' };
  }
}

export async function updateInventoryArchive(data: { [key: string]: any }) {
    const validation = archiveUpdateSchema.safeParse(data);

    if (!validation.success) {
        console.error('Validation Error:', validation.error.flatten());
        return { error: 'Datos de archivador inválidos.' };
    }

    const { id, ...archiveData } = validation.data;
    const docRef = doc(db, 'archivadores_inventario', id);
    
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
            errorEmitter.emit('permission-error', permissionError);
        }
        return { error: 'No se pudo actualizar el archivador.' };
    }
}


export async function deleteInventoryArchive(archiveId: string) {
  if (!archiveId) {
    return { error: 'ID de archivador no válido.' };
  }
  const docRef = doc(db, 'archivadores_inventario', archiveId);
  try {
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { error: 'No se pudo eliminar el archivador.' };
  }
}
