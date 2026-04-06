'use server';

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp, writeBatch, query } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { sendEmail } from '@/ai/flows/send-email';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const app = getApps().find(app => app.name === 'server-actions-replacements') || initializeApp(firebaseConfig, 'server-actions-replacements');
const db = getFirestore(app);

// Esquema permisivo para evitar bloqueos en el guardado
const replacementSchema = z.object({
  'FECHA DE INGRESO DOC': z.any().optional(),
  NOMBRE: z.string().min(1, 'El nombre del reemplazante es requerido.'),
  MES: z.string().optional().nullable(),
  CARGO: z.string().optional().nullable(),
  FUNCIONES: z.string().optional().nullable(),
  UNIDAD: z.string().optional().nullable(),
  DESDE: z.any().optional(),
  HASTA: z.any().optional(),
  'NOMBRE REEMPLAZADO': z.string().min(1, 'El nombre del reemplazado es requerido.'),
  MOTIVO: z.string().optional().nullable(),
  OBSERVACION: z.string().optional().nullable(),
  IMAGEN: z.string().optional().nullable(),
  ESTADO: z.string().optional().nullable(),
  'JEFE SERVICIO': z.string().optional().nullable(),
  CORREO: z.string().optional().nullable(),
  ESTADO_R_NR: z.string().optional().nullable(),
  'FECHA DEL AVISO': z.any().optional().nullable(),
  AÑO: z.string().optional().nullable(),
  'NUMERO RES': z.string().optional().nullable(),
  archivadorId: z.string().optional().nullable(),
});

const convertToFirestoreData = (data: any) => {
    const firestoreData = { ...data };
    const dateFields = ['DESDE', 'HASTA', 'FECHA DE INGRESO DOC', 'FECHA DEL AVISO'];
    
    dateFields.forEach(field => {
        if (firestoreData[field]) {
            const date = new Date(firestoreData[field]);
            if (!isNaN(date.getTime())) {
                firestoreData[field] = Timestamp.fromDate(date);
            } else if (!(firestoreData[field] instanceof Timestamp)) {
                delete firestoreData[field]; // Evitar guardar basura si la fecha es inválida
            }
        }
    });
    return firestoreData;
};

export async function addReplacement(data: any) {
  const validation = replacementSchema.safeParse(data);
  if (!validation.success) {
      console.error("Errores de validación:", validation.error.format());
      return { error: 'Datos de reemplazo inválidos. Verifica los nombres obligatorios.' };
  }

  const firestoreData = convertToFirestoreData(validation.data);

  try {
    const docRef = await addDoc(collection(db, 'reemplazos'), firestoreData);
    
    // Notificación opcional si hay estado y correo
    if ((firestoreData.ESTADO === 'Aceptado' || firestoreData.ESTADO === 'Rechazado') && firestoreData.CORREO) {
        try {
            const desde = firestoreData.DESDE instanceof Timestamp ? firestoreData.DESDE.toDate() : new Date(firestoreData.DESDE);
            const hasta = firestoreData.HASTA instanceof Timestamp ? firestoreData.HASTA.toDate() : new Date(firestoreData.HASTA);
            
            await sendEmail({
                to: firestoreData.CORREO,
                subject: `Estado de Reemplazo: ${firestoreData.ESTADO}`,
                htmlContent: `<p>Hola, se ha actualizado la solicitud para ${firestoreData['NOMBRE REEMPLAZADO']}.</p><p>Estado: ${firestoreData.ESTADO}</p><p>Periodo: ${format(desde, 'PP', {locale: es})} al ${format(hasta, 'PP', {locale: es})}</p>`,
            });
            await updateDoc(docRef, { 'FECHA DEL AVISO': Timestamp.now() });
        } catch (e) {
            console.error("Error enviando correo:", e);
        }
    }
    
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { error: 'Error al guardar: ' + error.message };
  }
}

export async function updateReplacement(data: any) {
  if (!data.id) return { error: 'ID faltante.' };
  const validation = replacementSchema.safeParse(data);
  if (!validation.success) return { error: 'Datos inválidos.' };

  const firestoreData = convertToFirestoreData(validation.data);
  try {
    await updateDoc(doc(db, 'reemplazos', data.id), firestoreData);
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al actualizar: ' + error.message };
  }
}

export async function deleteReplacement(id: string) {
  try {
    await deleteDoc(doc(db, 'reemplazos', id));
    return { success: true };
  } catch (error: any) {
    return { error: 'No se pudo eliminar.' };
  }
}

export async function updateReplacementStatus(id: string, status: string) {
  try {
    await updateDoc(doc(db, 'reemplazos', id), { 'ESTADO_R_NR': status });
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al actualizar estado.' };
  }
}

export async function archiveReplacement(id: string, archId: string) {
  try {
    await updateDoc(doc(db, 'reemplazos', id), { archivadorId: archId });
    return { success: true };
  } catch (error: any) {
    return { error: 'Error al archivar.' };
  }
}

export async function addMultipleReplacements(replacements: any[]) {
    const batch = writeBatch(db);
    replacements.forEach(item => {
        const docRef = doc(collection(db, 'reemplazos'));
        batch.set(docRef, convertToFirestoreData(item));
    });
    try {
        await batch.commit();
        return { success: true, count: replacements.length };
    } catch (error: any) {
        return { error: 'Error en carga masiva: ' + error.message };
    }
}

export async function generateMonthlyReplacements(monthKey?: string, templateId?: string): Promise<{ success?: boolean; count?: number; error?: string }> {
    const targetMonth = monthKey || format(new Date(), 'yyyy-MM');
    const [year, month] = targetMonth.split('-').map(Number);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); 

    try {
        let templates: any[] = [];
        if (templateId) {
            const templateDoc = await getDoc(doc(db, 'reemplazos_mensuales', templateId));
            if (templateDoc.exists()) {
                templates = [{ ...templateDoc.data(), ref: templateDoc.ref }];
            }
        } else {
            const templatesQuery = query(collection(db, 'reemplazos_mensuales'));
            const querySnapshot = await getDocs(templatesQuery);
            templates = querySnapshot.docs.map(d => ({ ...d.data(), ref: d.ref }));
        }

        const batch = writeBatch(db);
        let count = 0;

        for (const template of templates) {
            if (template.lastGeneratedMonth !== targetMonth) {
                const newReplacementRef = doc(collection(db, 'reemplazos'));
                
                batch.set(newReplacementRef, {
                    NOMBRE: template.NOMBRE,
                    'NOMBRE REEMPLAZADO': template['NOMBRE REEMPLAZADO'],
                    CARGO: template.CARGO || '',
                    UNIDAD: template.UNIDAD || '',
                    MOTIVO: template.MOTIVO || '',
                    FUNCIONES: template.FUNCIONES || '',
                    'JEFE SERVICIO': template['JEFE SERVICIO'] || '',
                    CORREO: template.CORREO || '',
                    DESDE: Timestamp.fromDate(startDate),
                    HASTA: Timestamp.fromDate(endDate),
                    'FECHA DE INGRESO DOC': Timestamp.now(),
                    ESTADO_R_NR: 'EN PROCESO',
                    MES: format(startDate, 'MMMM', { locale: es }),
                    AÑO: year.toString(),
                    ESTADO: 'Pendiente'
                });
                
                batch.update(template.ref, { lastGeneratedMonth: targetMonth });
                count++;
            }
        }

        if (count > 0) {
            await batch.commit();
        }
        
        return { success: true, count };
    } catch (error: any) {
        console.error("Error generating replacements:", error);
        return { error: 'Error al generar reemplazos: ' + error.message };
    }
}

export async function createMonthlyTemplate(replacement: any) {
    try {
        const templateData = {
            NOMBRE: replacement.NOMBRE,
            'NOMBRE REEMPLAZADO': replacement['NOMBRE REEMPLAZADO'],
            CARGO: replacement.CARGO || '',
            UNIDAD: replacement.UNIDAD || '',
            MOTIVO: replacement.MOTIVO || '',
            FUNCIONES: replacement.FUNCIONES || '',
            'JEFE SERVICIO': replacement['JEFE SERVICIO'] || '',
            CORREO: replacement.CORREO || '',
            lastGeneratedMonth: format(new Date(), 'yyyy-MM') // Marcar el mes actual como ya generado
        };
        
        await addDoc(collection(db, 'reemplazos_mensuales'), templateData);
        return { success: true };
    } catch (error: any) {
        return { error: 'Error al crear plantilla: ' + error.message };
    }
}

export async function deleteMonthlyTemplate(id: string) {
    try {
        await deleteDoc(doc(db, 'reemplazos_mensuales', id));
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
