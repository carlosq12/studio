'use server';

import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, Timestamp, writeBatch, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { FuncionarioVale, MarcaVale } from '@/lib/types';
import { calcularJornadasAvanzado, MarcacionRow, FuncionarioInfo } from './utils/calculos';
import { 
  format, 
  parse, 
  eachDayOfInterval, 
  isWithinInterval, 
  isSameDay, 
  isValid,
  startOfMonth
} from 'date-fns';
import { es } from 'date-fns/locale';

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);
 
// Normalizar RUT
function cleanRut(rut: string) {
    return rut.replace(/[^0-9Kk]/g, '').toUpperCase();
}

// Eschemas de Validación Zod
const funcionarioValeSchema = z.object({
  RUT: z.string().min(1, 'El RUT es requerido.'),
  nombres: z.string().min(1, 'El nombre es requerido.'),
  apellidos: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  acNo: z.string().optional().nullable(),
  jornada: z.string().optional().nullable(),
  calidadContractual: z.string().optional().nullable(),
  fechaIngreso: z.any().optional(),
  esGremialista: z.boolean().optional().nullable(),
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

export async function processMarcasMasivas(
  marcas: any[], 
  mesAsistencia: string, 
  valorVale: number = 4000,
  diasHabilesAsistencia: number = 20,
  mesPago: string = '',
  diasHabilesPago: number = 20
) {
    // 1. Obtener todos los funcionarios actuales
    const funcionariosSnapshot = await getDocs(collection(db, 'funcionarios_vales'));
    const funcionariosMap = new Map<string, FuncionarioVale>(); // acNo -> Funcionario
    const funcMapParaCalculo: Record<string, FuncionarioInfo> = {};
    
    funcionariosSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as FuncionarioVale;
        data.id = docSnap.id;
        const acNo = String(data.acNo || '').trim();
        if (acNo) {
            funcionariosMap.set(acNo, data);
            funcMapParaCalculo[acNo] = {
                acNo: acNo,
                nombre: `${data.nombres} ${data.apellidos || ''}`.trim(),
                jornadaTipo: (data.jornada || '').toLowerCase().includes('turno') ? 'turno' : 'normal',
                rut: data.RUT
            };
        }
    });

    // 2. Convierte marcas crudas del Excel temporal a formáto válido para cálculo
    const marcacionesCrudas: MarcacionRow[] = [];
    marcas.forEach((row: any) => {
        const keys = Object.keys(row);
        const acKey = keys.find(k => k.toLowerCase().includes('ac-no') || k.toLowerCase().includes('ac - no'));
        const nameKey = keys.find(k => k.toLowerCase() === 'nombre');
        const timeKey = keys.find(k => k.toLowerCase() === 'horario' || k.toLowerCase().includes('fecha'));
        const statusKey = keys.find(k => k.toLowerCase() === 'estado' || k.toLowerCase() === 'estado nombre');

        if (acKey && timeKey && statusKey) {
            marcacionesCrudas.push({
               acNo: String(row[acKey]).trim(),
               nombre: nameKey ? String(row[nameKey]).trim() : "",
               horario: String(row[timeKey]).trim(),
               estado: String(row[statusKey]).trim()
            });
        }
    });

    if (marcacionesCrudas.length === 0) {
        return { error: 'No se encontraron registros crudos válidos. Verifica que las columnas sean: AC-No., Nombre, Horario, Estado.' };
    }

    // 3. Evaluar las horas trabajadas reales con su política de jornada de acuerdo al DB
    const resultadosCalculados = calcularJornadasAvanzado(marcacionesCrudas, funcMapParaCalculo);

    const batch = writeBatch(db);
    let guardados = 0;
    let noEncontrados: string[] = [];

    // --- NUEVO: Buscar configuración gremial previa para este mes ---
    const configRes = await getGremialesConfig(mesAsistencia);
    const configGremial = configRes.success ? configRes.config : {};

    const historialRef = doc(collection(db, 'historial_cargas_vales'));
    let montoTotal = 0;

    // 4. Guardar resultados
    for (const result of resultadosCalculados) {
        const funcionarioMatch = funcionariosMap.get(result.acNo);

        if (funcionarioMatch) {
            const calidad = (funcionarioMatch.calidadContractual || 'C').trim().toUpperCase();
            const diasTrabajadosReales = result.jornadasValidas;

            // --- NUEVO: Aplicar configuración gremial si existe ---
            let diasGremialesMasivos = 0;
            let fechasGremiales: string[] = [];
            
            if (configGremial && configGremial[funcionarioMatch.id]) {
                diasGremialesMasivos = configGremial[funcionarioMatch.id].diasMasivos || 0;
                fechasGremiales = configGremial[funcionarioMatch.id].fechas || [];
            }
            
            const totalGremiales = diasGremialesMasivos + fechasGremiales.length;
            const asistenciaEfectiva = diasTrabajadosReales + totalGremiales;

            let valesFormula = 0;
            // R (Reemplazo), EDF (Reemplazo), TU (Titular/Otros) no aplican fórmula
            if (calidad === 'R' || calidad === 'EDF' || calidad === 'TU') {
                valesFormula = diasTrabajadosReales;
            } else {
                // Cálculo de ausencias basado SOLO en días presenciales
                const ausencias = Math.max(0, diasHabilesAsistencia - diasTrabajadosReales);
                valesFormula = Math.max(0, diasHabilesPago - ausencias);
            }

            // Los días gremiales se suman AL FINAL, fuera de la lógica de ausencias
            const valesAPagar = valesFormula + totalGremiales;

            const marcaRef = doc(collection(db, 'marcas_vales'));
            const marcaData: Partial<MarcaVale> = {
                historialId: historialRef.id,
                funcionarioId: funcionarioMatch.id,
                RUT: funcionarioMatch.RUT,
                nombres: funcionarioMatch.nombres,
                apellidos: funcionarioMatch.apellidos,
                mes: mesAsistencia, // Backward compat
                mesAsistencia,
                mesPago,
                diasHabilesAsistencia,
                diasHabilesPago,
                calidadContractual: calidad,
                valesCalculadosReales: valesAPagar,
                diasTrabajados: valesAPagar, // Stores final vales count
                diasPresenciales: diasTrabajadosReales,
                diasGremiales: totalGremiales,
                diasGremialesMasivos,
                fechasGremiales,
                diasAusencia: result.noMarcajes,
                montoAsignado: valesAPagar * valorVale,
                fechaCarga: Timestamp.now(),
                detalles: result.detalles || []
            };
            batch.set(marcaRef, marcaData);
            guardados++;
            montoTotal += valesAPagar * valorVale;
        } else {
            noEncontrados.push(`${result.acNo} - ${result.nombre}`);
        }
    }

    try {
        if (guardados > 0) {
            batch.set(historialRef, {
                mes: mesAsistencia,
                fechaCarga: Timestamp.now(),
                cantidadRegistros: guardados,
                montoTotal: montoTotal,
                valorVale: valorVale
            });
            await batch.commit();
        }
        return { 
            success: true, 
            count: guardados, 
            missing: noEncontrados.length,
            missingList: noEncontrados.slice(0, 5) // Mostramos solo algunos en el UI
        };
    } catch (error: any) {
        return { error: 'Error al persistir cálculo masivo: ' + error.message };
    }
}

export async function updateHistorialValorVale(historialId: string, nuevoValor: number) {
    if (!historialId || nuevoValor <= 0) return { error: 'Datos inválidos.' };

    try {
        const marcasSnapshot = await getDocs(query(collection(db, 'marcas_vales'), where('historialId', '==', historialId)));
        const batch = writeBatch(db);
        let nuevoMontoTotal = 0;

        marcasSnapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const vales = data.diasTrabajados || 0;
            const nuevoMonto = vales * nuevoValor;
            
            batch.update(docSnap.ref, {
                montoAsignado: nuevoMonto
            });
            nuevoMontoTotal += nuevoMonto;
        });

        // Actualizar el historial
        batch.update(doc(db, 'historial_cargas_vales', historialId), {
            valorVale: nuevoValor,
            montoTotal: nuevoMontoTotal
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error al actualizar valor del vale:", error);
        return { error: 'No se pudo actualizar el valor del vale: ' + error.message };
    }
}

export async function updateMarcasBatch(updates: { id: string, montoAsignado: number }[]) {
    if (!updates || updates.length === 0) return { success: true };
    try {
        const batch = writeBatch(db);
        updates.forEach(upd => {
            const docRef = doc(db, 'marcas_vales', upd.id);
            batch.update(docRef, { montoAsignado: upd.montoAsignado });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateHistorialHeader(historialId: string, data: { valorVale: number, montoTotal: number }) {
    try {
        await updateDoc(doc(db, 'historial_cargas_vales', historialId), data);
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
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

export async function deleteFuncionariosValesMasivos(ids: string[]) {
    const batch = writeBatch(db);
    try {
        for (const id of ids) {
            const funcRef = doc(db, 'funcionarios_vales', id);
            batch.delete(funcRef);
        }
        await batch.commit();
        return { success: true, count: ids.length };
    } catch (error: any) {
        return { error: 'Error al eliminar funcionarios: ' + error.message };
    }
}

export async function deleteHistorialCarga(historialId: string) {
    try {
        const batch = writeBatch(db);
        
        const historialRef = doc(db, 'historial_cargas_vales', historialId);
        batch.delete(historialRef);

        const q = query(collection(db, 'marcas_vales'), where('historialId', '==', historialId));
        const snapshot = await getDocs(q);
        snapshot.forEach(d => {
            batch.delete(d.ref);
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { error: 'Error al eliminar el historial: ' + error.message };
    }
}

export async function deleteMarcaVale(id: string, historialId?: string, monto?: number) {
    try {
        const batch = writeBatch(db);
        const marcaRef = doc(db, 'marcas_vales', id);
        batch.delete(marcaRef);

        if (historialId && monto !== undefined) {
             const historialRef = doc(db, 'historial_cargas_vales', historialId);
             const historialSnap = await getDoc(historialRef);
             if (historialSnap.exists()) {
                 const currentData = historialSnap.data();
                 batch.update(historialRef, {
                     cantidadRegistros: Math.max(0, (currentData.cantidadRegistros || 1) - 1),
                     montoTotal: Math.max(0, (currentData.montoTotal || 0) - monto)
                 });
             }
        }
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { error: 'Error al eliminar el vale: ' + error.message };
    }
}


export async function updateMarcaValeCount(marcaId: string, newCount: number, valorVale: number = 4000) {
    try {
        const marcaRef = doc(db, 'marcas_vales', marcaId);
        const marcaSnap = await getDoc(marcaRef);
        
        if (!marcaSnap.exists()) {
            return { error: 'El registro de marca no existe.' };
        }
        
        const marcaData = marcaSnap.data() as MarcaVale;
        const oldMonto = marcaData.montoAsignado || 0;
        const newMonto = newCount * valorVale;
        const diffMonto = newMonto - oldMonto;
        
        const batch = writeBatch(db);
        
        // 1. Actualizar el registro individual
        batch.update(marcaRef, {
            diasTrabajados: newCount,
            montoAsignado: newMonto,
            diasPresenciales: (marcaData as any).diasPresenciales || 0, // Preserve or update if called from recalculate
            observaciones: `Ajuste manual: de ${marcaData.diasTrabajados} a ${newCount} vales.`
        });
        
        // 2. Actualizar el total del historial si corresponde
        if (marcaData.historialId) {
            const historialRef = doc(db, 'historial_cargas_vales', marcaData.historialId);
            const historialSnap = await getDoc(historialRef);
            if (historialSnap.exists()) {
                const histData = historialSnap.data();
                batch.update(historialRef, {
                    montoTotal: (histData.montoTotal || 0) + diffMonto
                });
            }
        }
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error('Error al actualizar conteo de vales:', error);
        return { error: error.message || 'No se pudo actualizar el registro.' };
    }
}

export async function recalculateMarcaVale(marcaId: string, valorVale: number = 4000, forceRealDays?: number) {
    try {
        const marcaRef = doc(db, 'marcas_vales', marcaId);
        const marcaSnap = await getDoc(marcaRef);
        
        if (!marcaSnap.exists()) return { error: 'El registro no existe.' };
        const marcaData = marcaSnap.data() as MarcaVale;

        // 1. Obtener calidad actual del funcionario (fresca de la DB)
        let calidad = (marcaData.calidadContractual || 'C').trim().toUpperCase();
        
        try {
            if (marcaData.funcionarioId) {
                const funcSnap = await getDoc(doc(db, 'funcionarios_vales', marcaData.funcionarioId));
                if (funcSnap.exists()) {
                    calidad = (funcSnap.data().calidadContractual || 'C').trim().toUpperCase();
                }
            } else {
                const funcQuery = query(collection(db, 'funcionarios_vales'), where('RUT', '==', marcaData.RUT));
                const funcSnap = await getDocs(funcQuery);
                if (!funcSnap.empty) {
                    calidad = (funcSnap.docs[0].data().calidadContractual || 'C').trim().toUpperCase();
                }
            }
        } catch (e) {
            console.error("Error al buscar calidad del funcionario:", e);
        }

        // 2. Determinar días trabajados reales
        let diasTrabajadosReales = marcaData.diasPresenciales || 0;
        
        if (forceRealDays !== undefined) {
            diasTrabajadosReales = forceRealDays;
        } else if (marcaData.detalles && Array.isArray(marcaData.detalles) && marcaData.detalles.length > 0) {
            // Verificar si los detalles tienen el nuevo formato con esValida
            const firstDetail = marcaData.detalles[0] as any;
            if (typeof firstDetail === 'object' && firstDetail !== null && 'esValida' in firstDetail) {
                const totalMarcasValidas = marcaData.detalles.filter((d: any) => d.esValida).length;
                diasTrabajadosReales = Math.floor(totalMarcasValidas / 2);
            }
            // Si es el formato antiguo (strings) o no tiene esValida, mantenemos el diasPresenciales actual
        }

        // 2.5 Sumar días gremiales (Masivos + Únicos por fecha)
        const diasGremialesMasivos = marcaData.diasGremialesMasivos || 0;
        const fechasGremiales = marcaData.fechasGremiales || [];
        const totalGremiales = diasGremialesMasivos + fechasGremiales.length;
        const asistenciaEfectiva = diasTrabajadosReales + totalGremiales;

        // 3. Aplicar fórmula según calidad contractual detectada (SOLO sobre días presenciales)
        let valesFormula = 0;
        const diasHabilesAsistencia = marcaData.diasHabilesAsistencia || 0;
        const diasHabilesPago = marcaData.diasHabilesPago || 0;

        if (calidad === 'R' || calidad === 'EDF' || calidad === 'TU') {
            valesFormula = diasTrabajadosReales;
        } else {
            // El cálculo de ausencias se hace SOLO con días presenciales
            const ausencias = Math.max(0, diasHabilesAsistencia - diasTrabajadosReales);
            valesFormula = Math.max(0, diasHabilesPago - ausencias);
        }

        // 4. Sumar los días gremiales al resultado final del cálculo
        const valesAPagar = valesFormula + totalGremiales;

        // 4. Actualizar el registro con el nuevo cálculo
        const res = await updateMarcaValeCount(marcaId, valesAPagar, valorVale);
        if (res.success) {
            // También actualizamos los campos descriptivos y el total de gremiales
            await updateDoc(marcaRef, { 
                diasPresenciales: diasTrabajadosReales,
                diasGremiales: totalGremiales // Mantenemos este como el total calculado
            });
            // Retornamos también la nueva calidad por si cambió
            return { success: true, nuevaCalidad: calidad, nuevoConteo: valesAPagar, diasPresenciales: diasTrabajadosReales };
        }
        return { success: false, error: res.error };

    } catch (error: any) {
        console.error('Error al recalcular:', error);
        return { success: false, error: error.message };
    }
}

export async function setDiaValidez(marcaId: string, indices: number[], esValido: boolean) {
    try {
        const marcaRef = doc(db, 'marcas_vales', marcaId);
        const marcaSnap = await getDoc(marcaRef);
        if (!marcaSnap.exists()) return { success: false, error: 'El registro no existe.' };
        
        const marcaData = marcaSnap.data() as MarcaVale;
        const detalles = [...(marcaData.detalles || [])];
        
        indices.forEach(idx => {
            if (detalles[idx]) {
                detalles[idx].esValida = esValido;
            }
        });
        
        await updateDoc(marcaRef, { detalles });
        
        // Recalculamos el total automáticamente basado en las nuevas marcas válidas
        return await recalculateMarcaVale(marcaId);
    } catch (error: any) {
        console.error('Error al actualizar validez del día:', error);
        return { success: false, error: error.message };
    }
}

function parseExcelDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + val * 86400000);
    }
    const s = String(val).trim();
    // Intentar formatos comunes: DD/MM/YYYY o YYYY-MM-DD
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy'];
    for (const f of formats) {
        const p = parse(s, f, new Date());
        if (isValid(p)) return p;
    }
    return null;
}

export async function previewViaticosMasivos(viaticosList: any[], targetHistorialId: string) {
    try {
        const previewResults: any[] = [];
        
        // 1. Obtener todos los registros del historial de destino
        const qTarget = query(collection(db, 'marcas_vales'), where('historialId', '==', targetHistorialId));
        const targetSnap = await getDocs(qTarget);
        if (targetSnap.empty) {
            return { error: "No hay registros de vales en el historial seleccionado." };
        }
        
        // Mapa de RUT -> MarcaValeDoc (destino)
        const targetMap = new Map<string, any>();
        targetSnap.docs.forEach(doc => {
            const data = doc.data();
            const rut = data.RUT ? cleanRut(data.RUT) : '';
            if (rut) targetMap.set(rut, { id: doc.id, ...data });
        });

        const monthsMap: Record<string, string> = {
            'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
        };

        // 2. Agrupar el Excel por RUT
        const groupedByRut = new Map<string, any[]>();
        viaticosList.forEach(item => {
            const rutRaw = String(item['RUT'] || item['Rut'] || item['rut'] || '').trim();
            if (!rutRaw) return;
            const rutNorm = rutRaw.replace(/[^0-9Kk]/g, '').toUpperCase();
            if (!groupedByRut.has(rutNorm)) groupedByRut.set(rutNorm, []);
            groupedByRut.get(rutNorm)!.push(item);
        });

        // 3. Procesar cada fila del Excel
        for (const item of viaticosList) {
            const rutRaw = String(item['RUT'] || item['Rut'] || item['rut'] || '').trim();
            if (!rutRaw) continue;
            
            const rutNorm = rutRaw.replace(/[^0-9Kk]/g, '').toUpperCase();
            const targetMarca = targetMap.get(rutNorm);
            
            if (!targetMarca) continue; // Si no está en el mes de destino, no podemos descontar

            const resNo = String(item['NUMERO_RESOLUCION'] || item['NUMERO RES'] || item['Resolucion'] || 'S/N').trim();
            const start = parseExcelDate(item['FECHA_INICIO'] || item['FECHA INICIO'] || item['DESDE']);
            const end = parseExcelDate(item['FECHA_TERMINO'] || item['FECHA TERMINO'] || item['HASTA']);

            if (!start || !end) continue;

            // Obtener TODAS las marcas históricas para este funcionario una sola vez
            // Usamos el RUT original del documento para que la consulta de Firestore funcione (por los puntos/guiones)
            const rutParaConsulta = targetMarca.RUT || rutNorm;
            let allMarcas = [];
            const qAll = query(collection(db, 'marcas_vales'), where('RUT', '==', rutParaConsulta));
            const allSnap = await getDocs(qAll);
            allMarcas = allSnap.docs.map(d => d.data() as MarcaVale);

            if (allMarcas.length === 0) {
                console.log(`[Análisis] No se encontró historial para el RUT original: ${rutParaConsulta}. Probando con RUT normalizado...`);
                const qNorm = query(collection(db, 'marcas_vales'), where('RUT', '==', rutNorm));
                const snapNorm = await getDocs(qNorm);
                allMarcas = snapNorm.docs.map(d => d.data() as MarcaVale);
            }

            const daysInRange = eachDayOfInterval({ start, end });
            let countForThisRes = 0;
            const validatedDays: string[] = [];

            daysInRange.forEach(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const hasValidMark = allMarcas.some(m => {
                    return m.detalles?.some(d => {
                        if (!d.esValida) return false;
                        const parts = d.horario.split('|')[0].trim().toLowerCase();
                        const match = parts.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
                        if (match) {
                            const dNum = match[1].padStart(2, '0');
                            const mNum = monthsMap[match[2]];
                            if (mNum && `${match[3]}-${mNum}-${dNum}` === dayStr) return true;
                        }
                        return parts.includes(dayStr);
                    });
                });

                if (hasValidMark) {
                    countForThisRes++;
                    validatedDays.push(format(day, 'dd/MM'));
                }
            });

            // Agregamos a la previa aunque count sea 0, para que el usuario vea que se procesó
            const realEarnedVales = (targetMarca.diasTrabajados || 0) + (targetMarca.viaticos || 0);
            
            previewResults.push({
                marcaId: targetMarca.id,
                rut: rutNorm,
                nombres: `${targetMarca.nombres} ${targetMarca.apellidos || ''}`.trim(),
                resolucion: resNo,
                rango: `${format(start, 'dd/MM')} al ${format(end, 'dd/MM')}`,
                diasRango: daysInRange.length,
                viaticosDetectados: countForThisRes,
                valesOriginales: realEarnedVales,
                valesFinales: Math.max(0, realEarnedVales - countForThisRes),
                fechasValidadas: validatedDays.join(', '),
                rawRows: [item]
            });
        }

        if (previewResults.length === 0) {
            return { error: "Ningún funcionario del Excel coincide con el historial de destino seleccionado." };
        }

        return { success: true, previews: previewResults };

    } catch (error: any) {
        console.error("Error al previsualizar viáticos:", error);
        return { error: 'Error al procesar viáticos: ' + error.message };
    }
}

export async function saveGremialesBatch(updates: { marcaId: string, diasMasivos: number, fechas: string[] }[]) {
    try {
        const batch = writeBatch(db);
        for (const update of updates) {
            const ref = doc(db, "marcas_vales", update.marcaId);
            batch.update(ref, { 
                diasGremialesMasivos: update.diasMasivos ?? 0,
                fechasGremiales: update.fechas ?? []
            });
        }
        await batch.commit();

        // Recalcular todos de forma asíncrona
        const results = await Promise.all(updates.map(u => recalculateMarcaVale(u.marcaId)));
        
        return { success: true, count: updates.length };
    } catch (e: any) {
        console.error("Error en saveGremialesBatch:", e);
        return { success: false, error: e.message };
    }
}

export async function applySelectedViaticosMasivos(selectedDiscounts: any[], valorVale: number = 4000) {
    if (!selectedDiscounts || selectedDiscounts.length === 0) {
         return { error: 'No seleccionaste ningún descuento para aplicar.' };
    }
    try {
        const batch = writeBatch(db);
        let updatedCount = 0;
        const historialDiffs = new Map<string, number>();

        // Agrupar por marcaId para consolidar múltiples resoluciones
        const consolidado = new Map<string, { 
            totalADescontar: number, 
            detalles: string[],
            rawRows: any[] 
        }>();

        selectedDiscounts.forEach(d => {
            const current = consolidado.get(d.marcaId) || { totalADescontar: 0, detalles: [], rawRows: [] };
            current.totalADescontar += d.viaticosDetectados;
            current.detalles.push(`Res ${d.resolucion}: ${d.viaticosDetectados} días (${d.fechasValidadas || 'sin marcas'})`);
            current.rawRows.push(...(d.rawRows || []));
            consolidado.set(d.marcaId, current);
        });

        for (const [marcaId, updateData] of Array.from(consolidado.entries())) {
             const marcaRef = doc(db, 'marcas_vales', marcaId);
             const marcaSnap = await getDoc(marcaRef);
             
             if (marcaSnap.exists()) {
                 const data = marcaSnap.data() as MarcaVale;
                 
                 // Calculamos totales reales (Días Trabajados + Viáticos que ya tenía)
                 const totalRealGanados = (data.diasTrabajados || 0) + (data.viaticos || 0);
                 
                 // El nuevo total de viáticos será lo que ya tenía + lo nuevo (sin pasarse del total ganado)
                 const totalNuevosViaticos = Math.min(totalRealGanados, (data.viaticos || 0) + updateData.totalADescontar);
                 const totalNuevosVales = Math.max(0, totalRealGanados - totalNuevosViaticos);
                 
                 const oldMonto = data.montoAsignado || 0;
                 const newMonto = totalNuevosVales * valorVale;
                 const diff = newMonto - oldMonto;
                 
                 batch.update(marcaRef, {
                      diasTrabajados: totalNuevosVales,
                      viaticos: totalNuevosViaticos,
                      montoAsignado: newMonto,
                      observaciones: `${data.observaciones || ''}\n[Carga Masiva]: ${updateData.detalles.join(' | ')}`.trim(),
                      detallesViaticos: updateData.rawRows,
                      columnasViaticos: updateData.rawRows.length > 0 ? Object.keys(updateData.rawRows[0]) : []
                 });
                 
                 updatedCount++;
                 
                 if (data.historialId) {
                     const currentDiff = historialDiffs.get(data.historialId) || 0;
                     historialDiffs.set(data.historialId, currentDiff + diff);
                 }
             }
        }
        
        if (updatedCount > 0) {
            for (const [hId, diff] of Array.from(historialDiffs.entries())) {
                  const hRef = doc(db, 'historial_cargas_vales', hId);
                  const hSnap = await getDoc(hRef);
                  if (hSnap.exists()) {
                      const hData = hSnap.data();
                      batch.update(hRef, {
                          montoTotal: Math.max(0, (hData.montoTotal || 0) + diff)
                      });
                  }
            }
            await batch.commit();
        }
        return { success: true, count: updatedCount };
    } catch (error: any) {
        console.error("Error al aplicar viáticos:", error);
        return { error: 'Error al aplicar descuentos: ' + error.message };
    }
}

export async function deleteHistorialViaticos(historialViaticosId: string) {
    try {
        const batch = writeBatch(db);
        const ref = doc(db, 'historial_cargas_viaticos', historialViaticosId);
        batch.delete(ref);
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { error: 'Error al eliminar historial de viáticos: ' + error.message };
    }
}

// --- NUEVAS FUNCIONES PARA CONFIGURACIÓN ANTICIPADA DE GREMIALES ---

/**
 * Obtiene la configuración de días gremiales para un mes específico.
 */
export async function getGremialesConfig(mes: string) {
    try {
        const q = query(collection(db, 'configuracion_gremiales'), where('mes', '==', mes));
        const snap = await getDocs(q);
        const config: Record<string, { diasMasivos: number; fechas: string[] }> = {};
        snap.docs.forEach(doc => {
            const data = doc.data();
            config[data.funcionarioId] = {
                diasMasivos: data.diasMasivos || 0,
                fechas: data.fechas || []
            };
        });
        return { success: true, config };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Guarda la configuración de días gremiales para un mes específico.
 */
export async function saveGremialesConfig(mes: string, updates: { funcionarioId: string; diasMasivos: number; fechas: string[] }[]) {
    try {
        const batch = writeBatch(db);
        updates.forEach(upd => {
            // ID compuesto por Mes y Funcionario para evitar duplicados
            const docId = `${mes}_${upd.funcionarioId}`;
            const docRef = doc(db, 'configuracion_gremiales', docId);
            batch.set(docRef, {
                funcionarioId: upd.funcionarioId,
                mes: mes,
                diasMasivos: upd.diasMasivos,
                fechas: upd.fechas,
                updatedAt: Timestamp.now()
            }, { merge: true });
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Aplica la configuración guardada de un mes a una carga (historial) específica.
 */
export async function applyGremialesConfigToCarga(historialId: string, customMonth?: string) {
    try {
        // 1. Obtener el historial
        const histRef = doc(db, 'historial_cargas_vales', historialId);
        const histSnap = await getDoc(histRef);
        if (!histSnap.exists()) return { success: false, error: 'Carga no encontrada' };
        const histData = histSnap.data();
        const mes = customMonth || histData.mes; // Usar mes personalizado o el del historial

        // 2. Obtener la configuración de ese mes
        const configRes = await getGremialesConfig(mes);
        if (!configRes.success) return configRes;
        const config = configRes.config || {};

        // 3. Obtener todas las marcas de esa carga
        const qMarcas = query(collection(db, 'marcas_vales'), where('historialId', '==', historialId));
        const marcasSnap = await getDocs(qMarcas);

        if (marcasSnap.empty) return { success: true, message: 'No hay marcas en esta carga' };

        // 4. Mapear funcionarios a sus IDs de documento en marcas_vales
        const funcsSnap = await getDocs(collection(db, 'funcionarios_vales'));
        const rutToId: Record<string, string> = {};
        funcsSnap.docs.forEach(d => { rutToId[d.data().RUT] = d.id; });

        const batch = writeBatch(db);
        let appliedCount = 0;

        for (const marcaDoc of marcasSnap.docs) {
            const marcaData = marcaDoc.data();
            const rutLimpio = cleanRut(marcaData.RUT);
            const funcId = rutToId[rutLimpio];
            
            // Sincronización total: si no está en el plan, se resetea a 0
            const c = (funcId && config[funcId]) ? config[funcId] : { diasMasivos: 0, fechas: [] };
            
            batch.update(marcaDoc.ref, {
                diasGremialesMasivos: c.diasMasivos || 0,
                fechasGremiales: c.fechas || []
            });
            appliedCount++;
        }

        await batch.commit();

        // 5. RECALCULAR todas las marcas
        const recalculatePromises = marcasSnap.docs.map(marcaDoc => {
            return recalculateMarcaVale(marcaDoc.id);
        });

        await Promise.all(recalculatePromises);

        return { success: true, count: appliedCount };
    } catch (error: any) {
        console.error('Error al aplicar configuración:', error);
        return { success: false, error: error.message };
    }
}
