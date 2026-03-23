'use server';

import { collection, writeBatch, doc, addDoc, deleteDoc, updateDoc, Timestamp, getDoc, increment } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const app = getApps().find(app => app.name === 'server-actions-inventory') || initializeApp(firebaseConfig, 'server-actions-inventory');
const db = getFirestore(app);

const inventoryItemSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.'),
  descripcion: z.string().optional(),
  cantidad: z.number().min(0, 'La cantidad no puede ser negativa.'),
  stock: z.string().optional(),
  ubicacion: z.string().optional(),
  'fecha de ingreso': z.date().optional().nullable(),
  imagen: z.string().optional(),
});

type InventoryItemData = z.infer<typeof inventoryItemSchema>;

const inventoryItemUpdateSchema = inventoryItemSchema.extend({
  id: z.string().min(1, 'El ID es requerido.'),
});

type InventoryItemUpdateData = z.infer<typeof inventoryItemUpdateSchema>;

const parseData = (data: { [key: string]: FormDataEntryValue }) => {
    return {
        ...data,
        cantidad: data.cantidad ? parseInt(data.cantidad as string, 10) : 0,
        'fecha de ingreso': data['fecha de ingreso'] ? new Date(data['fecha de ingreso'] as string) : null,
    }
}


export async function addInventoryItem(data: { [key: string]: FormDataEntryValue }) {
    const rawData = parseData(data);
    const validation = inventoryItemSchema.safeParse(rawData);

    if (!validation.success) {
        console.error('Validation Error:', validation.error.flatten());
        return { error: 'Datos de inventario inválidos.' };
    }
  
    const dataToSave = {
        ...validation.data,
        'fecha de ingreso': validation.data['fecha de ingreso'] ? Timestamp.fromDate(validation.data['fecha de ingreso']) : null,
    };

    try {
        const docRef = await addDoc(collection(db, 'inventario'), dataToSave);
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error adding inventory item:', error);
        const permissionError = new FirestorePermissionError({
            path: 'inventario',
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        return { error: 'No se pudo añadir el item al inventario.' };
    }
}

export async function updateInventoryItem(data: { [key: string]: FormDataEntryValue }) {
    const rawData = parseData(data);
    const validation = inventoryItemUpdateSchema.safeParse(rawData);

    if (!validation.success) {
        console.error('Validation Error:', validation.error.flatten());
        return { error: 'Datos de inventario para actualización inválidos.' };
    }

    const { id, ...itemData } = validation.data;
    const docRef = doc(db, 'inventario', id);

    const dataToUpdate = {
        ...itemData,
        'fecha de ingreso': itemData['fecha de ingreso'] ? Timestamp.fromDate(itemData['fecha de ingreso']) : null,
    };

    try {
        await updateDoc(docRef, dataToUpdate);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating inventory item:', error);
        if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
        }
        return { error: error.message || 'No se pudo actualizar el item del inventario.' };
    }
}

export async function deleteInventoryItem(itemId: string) {
  if (!itemId) {
    return { error: 'ID de item no válido.' };
  }

  const docRef = doc(db, 'inventario', itemId);

  try {
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar el item del inventario:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { error: error.message || 'No se pudo eliminar el item.' };
  }
}

const inventoryArraySchema = z.array(inventoryItemSchema);

export async function addMultipleInventoryItems(items: InventoryItemData[]) {
    const validation = inventoryArraySchema.safeParse(items);

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

    validation.data.forEach(itemData => {
        const docRef = doc(collection(db, 'inventario'));
        batch.set(docRef, {
            ...itemData,
            'fecha de ingreso': itemData['fecha de ingreso'] ? Timestamp.fromDate(itemData['fecha de ingreso']) : null,
        });
    });

    try {
        await batch.commit();
        return { success: true, count: validation.data.length };
    } catch (error: any) {
        console.error('Error al añadir items en lote:', error);
        
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: 'inventario',
                operation: 'write', 
            });
            errorEmitter.emit('permission-error', permissionError);
        }

        return { error: error.message || 'No se pudieron añadir los items a la base de datos.' };
    }
}

export async function updateItemQuantity(itemId: string, quantityChange: number) {
  if (!itemId) {
    return { error: 'ID de item no válido.' };
  }
  if (typeof quantityChange !== 'number' || quantityChange === 0) {
    return { error: 'La cantidad debe ser un número distinto de cero.' };
  }

  const docRef = doc(db, 'inventario', itemId);

  try {
     // Check if item exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { error: 'El artículo no existe en el inventario.' };
    }

    const currentQuantity = docSnap.data().cantidad || 0;
    if (quantityChange < 0 && currentQuantity + quantityChange < 0) {
        return { error: `No se puede retirar ${-quantityChange} unidades. Solo hay ${currentQuantity} en stock.` };
    }

    await updateDoc(docRef, {
      cantidad: increment(quantityChange)
    });
    return { success: true, newQuantity: currentQuantity + quantityChange };
  } catch (error: any) {
    console.error('Error updating item quantity:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { cantidad: `increment(${quantityChange})` },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { error: error.message || 'No se pudo actualizar la cantidad del item.' };
  }
}
