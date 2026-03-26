
'use server';

import { collection, doc, addDoc, deleteDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const app = getApps().find(app => app.name === 'server-actions-inventory-equipos') || initializeApp(firebaseConfig, 'server-actions-inventory-equipos');
const db = getFirestore(app);

const equipoSchema = z.object({
  numero_interno: z.string().optional(),
  tipo_arriendo: z.string().optional(),
  'nombre equipo': z.string().min(1, 'El nombre del equipo es requerido.'),
  modelo: z.string().optional(),
  'tipo de equipo': z.string().optional(),
  descripcion: z.string().optional(),
  'correo relacionado': z.string().email('Correo no es válido.').optional().or(z.literal('')),
  estado: z.string().optional(),
  'ip equipo': z.string().optional(),
  'licencia office': z.string().optional(),
  'personal a cargo': z.string().optional(),
  'usuario del encargado': z.string().optional(),
  serial: z.string().optional(),
  ubicacion: z.string().optional(),
  dns1: z.string().optional(),
  dns2: z.string().optional(),
  'puerta de enlace ipv4': z.string().optional(),
  'mascara ipv4': z.string().optional(),
  'fecha de ingreso': z.date().optional().nullable(),
  archivadorId: z.string().optional(),
});

type EquipoData = z.infer<typeof equipoSchema>;

const equipoUpdateSchema = equipoSchema.extend({
  id: z.string().min(1, 'El ID es requerido.'),
});

export async function addInventarioEquipo(data: any) {
  const rawData = {
      ...data,
      'fecha de ingreso': data['fecha de ingreso'] ? new Date(data['fecha de ingreso']) : null,
  };
  const validation = equipoSchema.safeParse(rawData);

  if (!validation.success) {
    console.error('Validation Error:', validation.error.flatten());
    return { error: 'Datos de equipo inválidos.' };
  }
  
  const dataToSave = {
      ...validation.data,
      'fecha de ingreso': validation.data['fecha de ingreso'] ? Timestamp.fromDate(validation.data['fecha de ingreso']) : null,
  };

  try {
    const docRef = await addDoc(collection(db, 'inventario_equipos'), dataToSave);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding equipo:', error);
    const permissionError = new FirestorePermissionError({
      path: 'inventario_equipos',
      operation: 'create',
      requestResourceData: dataToSave,
    });
    if (errorEmitter) {
      errorEmitter.emit('permission-error', permissionError);
    }
    return { error: 'No se pudo añadir el equipo al inventario.' };
  }
}

export async function updateInventarioEquipo(data: z.infer<typeof equipoUpdateSchema>) {
    const rawData = {
        ...data,
       'fecha de ingreso': data['fecha de ingreso'] ? new Date(data['fecha de ingreso'] as any) : null,
    };
    const validation = equipoUpdateSchema.safeParse(rawData);

    if (!validation.success) {
        console.error('Validation Error:', validation.error.flatten());
        return { error: 'Datos para actualizar inválidos.' };
    }

    const { id, ...equipoData } = validation.data;
    const docRef = doc(db, 'inventario_equipos', id);
    
    const dataToUpdate = {
        ...equipoData,
        'fecha de ingreso': equipoData['fecha de ingreso'] ? Timestamp.fromDate(equipoData['fecha de ingreso']) : null,
    };

    try {
        await updateDoc(docRef, dataToUpdate);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating equipo:', error);
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
        return { error: error.message || 'No se pudo actualizar el equipo.' };
    }
}

export async function deleteInventarioEquipo(equipoId: string) {
    if (!equipoId) {
        return { error: 'ID de equipo no válido.' };
    }

    const docRef = doc(db, 'inventario_equipos', equipoId);

    try {
        await deleteDoc(docRef);
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar equipo:', error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            if (errorEmitter) {
                errorEmitter.emit('permission-error', permissionError);
            }
        }
        return { error: error.message || 'No se pudo eliminar el equipo.' };
    }
}

const equipoArraySchema = z.array(equipoSchema);

export async function addMultipleInventarioEquipos(equipos: EquipoData[]) {
    const validation = equipoArraySchema.safeParse(equipos);

    if (!validation.success) {
        const errorDetails = validation.error.issues.map(issue => {
            const rowIndex = issue.path[0];
            const field = issue.path[1];
            return `Fila ${Number(rowIndex) + 1}, Campo '${field}': ${issue.message}`;
        }).join('; ');
        console.error('Validation Error:', errorDetails);
        return { error: `Datos inválidos. Por favor, revisa: ${errorDetails}` };
    }

    const batch = writeBatch(db);

    validation.data.forEach(equipoData => {
        const docRef = doc(collection(db, 'inventario_equipos'));
        batch.set(docRef, {
            ...equipoData,
            'fecha de ingreso': equipoData['fecha de ingreso'] ? Timestamp.fromDate(equipoData['fecha de ingreso']) : null,
        });
    });

    try {
        await batch.commit();
        return { success: true, count: validation.data.length };
    } catch (error: any) {
        console.error('Error al añadir equipos en lote:', error);
        
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: 'inventario_equipos',
                operation: 'write', 
            });
            if (errorEmitter) {
                errorEmitter.emit('permission-error', permissionError);
            }
        }

        return { error: error.message || 'No se pudieron añadir los equipos a la base de datos.' };
    }
}

export async function archiveEquipo(equipoId: string, archivadorId: string) {
  if (!equipoId || !archivadorId) {
    return { error: 'ID de equipo o archivador no válido.' };
  }

  const equipoRef = doc(db, 'inventario_equipos', equipoId);

  try {
    await updateDoc(equipoRef, { archivadorId });
    return { success: true };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: equipoRef.path,
        operation: 'update',
        requestResourceData: { archivadorId },
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
    }
    return { error: 'No se pudo archivar el equipo.' };
  }
}

export async function unarchiveEquipos(equipoIds: string[]) {
  if (!equipoIds || equipoIds.length === 0) {
    return { error: 'No se han seleccionado equipos para desarchivar.' };
  }

  const batch = writeBatch(db);
  equipoIds.forEach(id => {
    const docRef = doc(db, 'inventario_equipos', id);
    batch.update(docRef, { archivadorId: '' });
  });

  try {
    await batch.commit();
    return { success: true, count: equipoIds.length };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: 'inventario_equipos',
        operation: 'update',
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
    }
    return { error: 'No se pudieron desarchivar los equipos.' };
  }
}
