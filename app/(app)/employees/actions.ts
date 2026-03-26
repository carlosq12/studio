'use server';

import { collection, writeBatch, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Initialize Firebase for server-side usage
// Avoid re-initializing
const app = getApps().find(app => app.name === 'server-actions') || initializeApp(firebaseConfig, 'server-actions');
const db = getFirestore(app);

const employeeSchema = z.object({
  'FECHA DE INGRESO': z.string().optional(),
  RUT: z.string().min(1, 'El RUT es requerido.'),
  'NOMBRE FUNCIONARIO': z.string().min(1, 'El nombre es requerido.'),
  'APELLIDO PATERNO': z.string().min(1, 'El apellido paterno es requerido.'),
  'APELLIDO MATERNO': z.string().optional(),
  TITULO: z.string().optional(),
  'UNIDAD O SERVICIO': z.string().optional(),
  ESTAMENTO: z.string().optional(),
  JEFATURA: z.string().optional(),
});

type EmployeeData = z.infer<typeof employeeSchema>;

const employeeUpdateSchema = employeeSchema.extend({
  id: z.string().min(1, 'El ID del empleado es requerido.'),
});

type EmployeeUpdateData = z.infer<typeof employeeUpdateSchema>;


export async function addEmployee(data: EmployeeData) {
  const validation = employeeSchema.safeParse(data);

  if (!validation.success) {
    console.error('Validation Error:', validation.error.flatten());
    return { error: 'Datos de empleado inválidos.' };
  }
  
  const employeeData = {
    ...validation.data,
    'FECHA DE INGRESO': validation.data['FECHA DE INGRESO'] || '',
    'UNIDAD O SERVICIO': validation.data['UNIDAD O SERVICIO'] || '',
    ESTAMENTO: validation.data.ESTAMENTO || '',
    JEFATURA: validation.data.JEFATURA || '',
    'APELLIDO MATERNO': validation.data['APELLIDO MATERNO'] || '',
    TITULO: validation.data.TITULO || '',
  };

  addDoc(collection(db, 'dotacion_personal'), employeeData).catch(
    (serverError) => {
      console.error('Error adding employee:', serverError);
      const permissionError = new FirestorePermissionError({
        path: 'dotacion_personal',
        operation: 'create',
        requestResourceData: employeeData,
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
    }
  );

  return { success: true };
}

export async function updateEmployee(data: EmployeeUpdateData) {
  const validation = employeeUpdateSchema.safeParse(data);

  if (!validation.success) {
    console.error('Validation Error:', validation.error.flatten());
    return { error: 'Datos de empleado para actualización inválidos.' };
  }

  const { id, ...employeeData } = validation.data;
  const docRef = doc(db, 'dotacion_personal', id);

  const dataToUpdate = {
    ...employeeData,
    'FECHA DE INGRESO': employeeData['FECHA DE INGRESO'] || '',
    'UNIDAD O SERVICIO': employeeData['UNIDAD O SERVICIO'] || '',
    ESTAMENTO: employeeData.ESTAMENTO || '',
    JEFATURA: employeeData.JEFATURA || '',
    'APELLIDO MATERNO': employeeData['APELLIDO MATERNO'] || '',
    TITULO: employeeData.TITULO || '',
  };

  try {
    await updateDoc(docRef, dataToUpdate);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating employee:', error);
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
    return { error: error.message || 'No se pudo actualizar el empleado.' };
  }
}

export async function addMultipleEmployees(employees: EmployeeData[]) {
    const employeeArraySchema = z.array(employeeSchema);
    const validation = employeeArraySchema.safeParse(employees);

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

    validation.data.forEach(employeeData => {
        const docRef = doc(collection(db, 'dotacion_personal'));
        batch.set(docRef, {
            ...employeeData,
            'FECHA DE INGRESO': employeeData['FECHA DE INGRESO'] || '',
            'UNIDAD O SERVICIO': employeeData['UNIDAD O SERVICIO'] || '',
            ESTAMENTO: employeeData.ESTAMENTO || '',
            JEFATURA: employeeData.JEFATURA || '',
            'APELLIDO MATERNO': employeeData['APELLIDO MATERNO'] || '',
            TITULO: employeeData.TITULO || '',
        });
    });

    try {
        await batch.commit();
        return { success: true, count: validation.data.length };
    } catch (error: any) {
        console.error('Error al añadir empleados en lote:', error);
        
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: 'dotacion_personal',
                operation: 'write', 
            });
            if (errorEmitter) {
                errorEmitter.emit('permission-error', permissionError);
            }
        }

        return { error: error.message || 'No se pudieron añadir los empleados a la base de datos.' };
    }
}

export async function deleteEmployee(employeeId: string) {
  if (!employeeId) {
    return { error: 'ID de empleado no válido.' };
  }

  const docRef = doc(db, 'dotacion_personal', employeeId);

  try {
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar empleado:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
    }
    return { error: error.message || 'No se pudo eliminar el empleado.' };
  }
}
