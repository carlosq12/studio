'use server';

import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, Timestamp, writeBatch, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { FuncionarioVale, MarcaVale } from '@/lib/types';
import { calcularJornadasAvanzado, MarcacionRow, FuncionarioInfo } from './utils/calculos';

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
  acNo: z.string().optional().nullable(),
  jornada: z.string().optional().nullable(),
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

export async function processMarcasMasivas(marcas: any[], mesStr: string, valorVale: number = 4000) {
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

    const historialRef = doc(collection(db, 'historial_cargas_vales'));
    let montoTotal = 0;

    // 4. Guardar resultados
    for (const result of resultadosCalculados) {
        const funcionarioMatch = funcionariosMap.get(result.acNo);

        if (funcionarioMatch) {
            // El funcionario fue localizado en BD, guardar la marca validada!
            const marcaRef = doc(collection(db, 'marcas_vales'));
            const marcaData: Partial<MarcaVale> = {
                historialId: historialRef.id,
                funcionarioId: funcionarioMatch.id,
                RUT: funcionarioMatch.RUT,
                nombres: funcionarioMatch.nombres,
                apellidos: funcionarioMatch.apellidos,
                mes: mesStr, // Ej. "2023-10"
                diasTrabajados: result.jornadasValidas,
                diasAusencia: result.noMarcajes,
                montoAsignado: result.jornadasValidas * valorVale,
                fechaCarga: Timestamp.now(),
                detalles: result.detalles || []
            };
            batch.set(marcaRef, marcaData);
            guardados++;
            montoTotal += result.jornadasValidas * valorVale;
        } else {
            // No existe este funcionario en el DB, avisaremos
            noEncontrados.push(`${result.acNo} - ${result.nombre}`);
        }
    }

    try {
        if (guardados > 0) {
            batch.set(historialRef, {
                mes: mesStr,
                fechaCarga: Timestamp.now(),
                cantidadRegistros: guardados,
                montoTotal: montoTotal
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

export async function previewViaticosMasivos(viaticosList: any[], historialId: string) {
    try {
        const viaticosMap = new Map<string, { count: number, fechas: Set<string>, rawRows: any[] }>();
        
        for (const item of viaticosList) {
            const rutRaw = String(item['RUT'] || item['Rut'] || item['rut'] || '').trim();
            if (!rutRaw) continue;
            
            const rutNorm = rutRaw.replace(/[^0-9Kk]/g, '').toUpperCase();
            if (!rutNorm) continue;
            
            const aDescontarVal = item['A descontar'] !== undefined ? Number(item['A descontar']) : 
                                  (item['TOTAL DIAS'] !== undefined ? Number(item['TOTAL DIAS']) : 1);
            
            const rawDate = item['FECHA'] || item['Fecha'] || item['fecha'];
            let parsedDate = '';
            if (rawDate) {
                 if (typeof rawDate === 'number') {
                     const excelEpoch = new Date(1899, 11, 30);
                     const dateObj = new Date(excelEpoch.getTime() + rawDate * 86400000);
                     parsedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                 } else {
                     parsedDate = String(rawDate).trim();
                 }
            }
            
            if (!isNaN(aDescontarVal) && aDescontarVal > 0) {
                const current = viaticosMap.get(rutNorm) || { count: 0, fechas: new Set<string>(), rawRows: [] };
                current.count += aDescontarVal;
                if (parsedDate) {
                    current.fechas.add(parsedDate);
                }
                current.rawRows.push(item);
                viaticosMap.set(rutNorm, current);
            }
        }
        
        if (viaticosMap.size === 0) {
           return { error: "No se encontraron RUTs válidos ni días a descontar en el archivo." };
        }

        const q = query(collection(db, 'marcas_vales'), where('historialId', '==', historialId));
        const snapshot = await getDocs(q);
        
        const previewResults: any[] = [];
        let rutsMatched = 0;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data() as MarcaVale;
            if (!data.RUT) return;
            const rutNorm = String(data.RUT).replace(/[^0-9Kk]/g, '').toUpperCase();
            
            if (viaticosMap.has(rutNorm)) {
                rutsMatched++;
                const viaticoData = viaticosMap.get(rutNorm)!;
                const viaticosToDiscount = viaticoData.count;
                const fechasStr = Array.from(viaticoData.fechas).join(', ');
                
                let oldVales = data.diasTrabajados || 0;
                let oldViaticos = data.viaticos || 0;
                
                // Real earned without discount
                const realEarnedVales = oldVales + oldViaticos;
                const newVales = Math.max(0, realEarnedVales - viaticosToDiscount);
                
                previewResults.push({
                    marcaId: docSnap.id,
                    rut: data.RUT,
                    nombres: `${data.nombres} ${data.apellidos || ''}`.trim(),
                    valesOriginales: realEarnedVales,
                    viaticosDetectados: viaticosToDiscount,
                    fechasViaticos: fechasStr,
                    valesFinales: newVales,
                    rawRows: viaticoData.rawRows,
                    historialId: data.historialId || null
                });
            }
        });
        
        if (previewResults.length === 0) {
             return { error: "Se procesó el archivo, pero ninguno de los RUTs coincide con los vales registrados para esta carga." };
        }

        return { success: true, previews: previewResults };

    } catch (error: any) {
        console.error("Error al previsualizar viáticos:", error);
        return { error: 'Error al procesar viáticos: ' + error.message };
    }
}

export async function applySelectedViaticosMasivos(selectedDiscounts: any[], valorVale: number = 4000, fileName?: string, selectedHistorialId?: string) {
    if (!selectedDiscounts || selectedDiscounts.length === 0) {
         return { error: 'No seleccionaste ningún descuento para aplicar.' };
    }
    try {
        const batch = writeBatch(db);
        let updatedCount = 0;
        const historialDiffs = new Map<string, number>();

        // Enviar todas las lecturas previas necesarias
        for (const discount of selectedDiscounts) {
             const marcaRef = doc(db, 'marcas_vales', discount.marcaId);
             const marcaSnap = await getDoc(marcaRef);
             
             if (marcaSnap.exists()) {
                 const data = marcaSnap.data() as MarcaVale;
                 
                 const newVales = discount.valesFinales;
                 const newViaticos = discount.viaticosDetectados;
                 
                 const oldMonto = data.montoAsignado || 0;
                 const newMonto = newVales * valorVale;
                 const diff = newMonto - oldMonto;
                 
                 batch.update(marcaRef, {
                      diasTrabajados: newVales,
                      viaticos: newViaticos,
                      montoAsignado: newMonto,
                      observaciones: `Se descontaron ${newViaticos} viáticos.${discount.fechasViaticos ? ` (Fechas: ${discount.fechasViaticos})` : ''} (Revisado Manualmente)`,
                      detallesViaticos: discount.rawRows || [],
                      columnasViaticos: discount.rawRows && discount.rawRows.length > 0 ? Object.keys(discount.rawRows[0]) : []
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
            
            if (selectedHistorialId) {
                const viaticosHistRef = doc(collection(db, 'historial_cargas_viaticos'));
                let totalDiff = 0;
                for (const diff of Array.from(historialDiffs.values())) {
                    totalDiff += Math.abs(diff); // Use absolute value to represent total discounted
                }
                batch.set(viaticosHistRef, {
                    fechaCarga: Timestamp.now(),
                    historialValesId: selectedHistorialId,
                    cantidadRegistros: updatedCount,
                    montoTotalDescontado: totalDiff,
                    fileName: fileName || 'Archivo manual'
                });
            }
            
            await batch.commit();
        }
        return { success: true, count: updatedCount };
    } catch (error: any) {
        console.error("Error al aplicar viáticos seleccionados:", error);
        return { error: 'Error al guardar los descuentos: ' + error.message };
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
