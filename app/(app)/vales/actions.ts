'use server';

import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, Timestamp, writeBatch } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { FuncionarioVale, MarcaVale } from '@/lib/types';

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);

// Eschemas de Validación Zod
const funcionarioValeSchema = z.object({
  RUT: z.string().min(1, 'El RUT es requerido.'),
  nombres: z.string().min(1, 'El nombre es requerido.'),
  apellidos: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  fechaIngreso: z.any().optional(),
});

export async function addFuncionarioVale(data: any) {
  const validation = funcionarioValeSchema.safeParse(data);
  if (!validation.success) {
      console.error("Errores de validación:", validation.error.format());
      return { error: 'Datos de funcionario inválidos.' };
  }

  const firestoreData = { ...validation.data };
  if (firestoreData.fechaIngreso && typeof firestoreData.fechaIngreso === 'string') {
      firestoreData.fechaIngreso = Timestamp.fromDate(new Date(firestoreData.fechaIngreso));
  } else if (!firestoreData.fechaIngreso) {
      firestoreData.fechaIngreso = Timestamp.now();
  }

  try {
    const docRef = await addDoc(collection(db, 'funcionarios_vales'), firestoreData);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { error: 'Error al agregar funcionario: ' + error.message };
  }
}

export async function updateFuncionarioVale(data: any) {
  if (!data.id) return { error: 'ID faltante.' };
  const validation = funcionarioValeSchema.safeParse(data);
  if (!validation.success) return { error: 'Datos inválidos.' };

  const firestoreData = { ...validation.data };
  if (firestoreData.fechaIngreso && typeof firestoreData.fechaIngreso === 'string') {
      firestoreData.fechaIngreso = Timestamp.fromDate(new Date(firestoreData.fechaIngreso));
  }

  try {
    await updateDoc(doc(db, 'funcionarios_vales', data.id), firestoreData);
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al actualizar funcionario: ' + error.message };
  }
}

export async function deleteFuncionarioVale(id: string) {
  try {
    await deleteDoc(doc(db, 'funcionarios_vales', id));
    return { success: true };
  } catch (error: any) {
    return { error: 'No se pudo eliminar el funcionario.' };
  }
}

export async function processMarcasMasivas(marcas: any[], mesStr: string) {
    // 1. Obtener todos los funcionarios actuales
    const funcionariosSnapshot = await getDocs(collection(db, 'funcionarios_vales'));
    const funcionariosMap = new Map<string, FuncionarioVale>(); // RUT -> Funcionario
    
    funcionariosSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as FuncionarioVale;
        data.id = docSnap.id;
        // Limpiamos el RUT para facilitar el cruce (quitando puntos y guiones opcional)
        const cleanRut = (data.RUT || '').trim().toLowerCase();
        funcionariosMap.set(cleanRut, data);
    });

    const batch = writeBatch(db);
    let guardados = 0;
    let noEncontrados = [];

    // 2. Iterar sobre las marcas del Excel
    for (const item of marcas) {
        const rutExcel = String(item['RUT'] || item['Rut'] || item['rut'] || '').trim().toLowerCase();
        const diasTrabajados = Number(item['DIAS TRABAJADOS'] || item['Dias Trabajados'] || item['Dias'] || 0);
        const diasAusencia = Number(item['AUSENCIAS'] || item['Ausencias'] || 0);
        const monto = Number(item['MONTO'] || item['Monto'] || 0);
        
        if (!rutExcel) continue;

        const funcionarioMatch = funcionariosMap.get(rutExcel);

        if (funcionarioMatch) {
            // El funcionario existe, crear la Marca vinculada
            const marcaRef = doc(collection(db, 'marcas_vales'));
            const marcaData: Partial<MarcaVale> = {
                funcionarioId: funcionarioMatch.id,
                RUT: funcionarioMatch.RUT,
                nombres: funcionarioMatch.nombres,
                apellidos: funcionarioMatch.apellidos,
                mes: mesStr, // Ej. "2023-10"
                diasTrabajados: diasTrabajados,
                diasAusencia: diasAusencia,
                montoAsignado: monto,
                fechaCarga: Timestamp.now()
            };
            batch.set(marcaRef, marcaData);
            guardados++;
        } else {
            // No existe el funcionario en la base de datos de Vales
            noEncontrados.push(rutExcel);
        }
    }

    try {
        if (guardados > 0) {
            await batch.commit();
        }
        return { 
            success: true, 
            count: guardados, 
            missing: noEncontrados.length,
            missingList: noEncontrados.slice(0, 5) // Mostramos solo algunos en el UI
        };
    } catch (error: any) {
        return { error: 'Error al realizar la carga masiva: ' + error.message };
    }
}

export async function uploadFuncionariosValesMasivos(funcionariosList: any[]) {
    const batch = writeBatch(db);
    let guardados = 0;

    for (const item of funcionariosList) {
        const rutStr = String(item['RUT'] || item['Rut'] || item['rut'] || '').trim();
        const nombres = String(item['NOMBRES'] || item['Nombres'] || item['NOMBRE'] || item['Nombre'] || '').trim();
        const apellidos = String(item['APELLIDOS'] || item['Apellidos'] || item['APELLIDO'] || item['Apellido'] || '').trim();
        const departamento = String(item['DEPARTAMENTO'] || item['Departamento'] || item['UNIDAD'] || item['Unidad'] || '').trim();
        const acNo = String(item['AC-No.'] || item['AC-NO'] || item['Ac-No'] || item['Reloj'] || item['RELOJ'] || '').trim();
        const jornada = String(item['JORNADA'] || item['Jornada'] || item['Turno'] || item['TURNO'] || '').trim();
        const estado = String(item['ESTADO'] || item['Estado'] || 'Activo').trim();

        if (!rutStr || (!nombres && !apellidos)) continue;

        const funcRef = doc(collection(db, 'funcionarios_vales'));
        const funcData: Partial<FuncionarioVale> = {
            RUT: rutStr,
            nombres: nombres,
            apellidos: apellidos,
            departamento: departamento,
            acNo: acNo,
            jornada: jornada,
            estado: estado,
            fechaIngreso: Timestamp.now()
        };
        batch.set(funcRef, funcData);
        guardados++;
    }

    try {
        if (guardados > 0) {
            await batch.commit();
        }
        return { success: true, count: guardados };
    } catch (error: any) {
        return { error: 'Error al importar funcionarios: ' + error.message };
    }
}
