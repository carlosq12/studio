'use server';

import { collection, query, where, getDocs, getFirestore, addDoc, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const app = getApps().find(app => app.name === 'server-actions-mis-vales') || initializeApp(firebaseConfig, 'server-actions-mis-vales');
const db = getFirestore(app);

// Normalizar RUT
function cleanRut(rut: string) {
    return rut.replace(/[^0-9Kk]/g, '').toUpperCase();
}

export async function registerCustomUser(rut: string, email: string, passwordHash: string) {
    if (!rut || !email || !passwordHash) return { error: 'Faltan datos.' };

    const cleanInputRut = cleanRut(rut);

    try {
        // 1. Verificar si el RUT ya tiene una cuenta creada
        const userQuery = query(collection(db, 'usuarios_funcionarios'), where('rut', '==', cleanInputRut));
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
            return { error: 'Este RUT ya tiene una cuenta registrada en el sistema.' };
        }
        
        // 1.5 Verificar si el email ya existe
        const emailQuery = query(collection(db, 'usuarios_funcionarios'), where('email', '==', email.toLowerCase()));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
             return { error: 'Este correo electrónico ya está en uso.' };
        }

        // 2. Verificar que el RUT exista en la base de datos "funcionarios_vales"
        const funcSnap = await getDocs(collection(db, 'funcionarios_vales'));
        let found = false;
        let funcData: any = null;

        for (const doc of funcSnap.docs) {
            const data = doc.data();
            if (data.RUT && cleanRut(data.RUT) === cleanInputRut) {
                found = true;
                funcData = data;
                break;
            }
        }

        if (!found) {
            return { error: 'El RUT ingresado no se encuentra registrado en el sistema de Vales de Alimentación.' };
        }

        // 3. Crear el registro "Pendiente" en Firestore directamente (Custom Auth)
        await addDoc(collection(db, 'usuarios_funcionarios'), {
            rut: cleanInputRut,
            email: email.toLowerCase(),
            password: passwordHash, // Basic plain or hashed provided by client
            nombres: funcData.nombres || '',
            apellidos: funcData.apellidos || '',
            estado: 'Pendiente',
            fechaRegistro: Timestamp.now()
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error al registrar usuario custom:", error);
        return { error: 'Ocurrió un error al verificar los datos: ' + error.message };
    }
}

export async function loginUserDB(email: string, passwordHash: string) {
    try {
        const userQuery = query(collection(db, 'usuarios_funcionarios'), where('email', '==', email.toLowerCase()));
        const userSnap = await getDocs(userQuery);
        
        if (userSnap.empty) {
            return { error: 'Correo o contraseña incorrectos.' };
        }
        
        // Usamos el primer resultado que coincida
        let matchedDoc: any = null;
        for (const doc of userSnap.docs) {
            const data = doc.data();
            if (data.password === passwordHash) {
                matchedDoc = { id: doc.id, ...data };
                break;
            }
        }

        if (!matchedDoc) {
             return { error: 'Correo o contraseña incorrectos.' };
        }

        return { success: true, user: matchedDoc };
    } catch (error: any) {
        console.error("Error en login custom:", error);
        return { error: 'Error al intentar iniciar sesión: ' + error.message };
    }
}

export async function fetchMisVales(rut: string) {
    try {
        const cleanInputRut = cleanRut(rut);
        const marcasQuery = query(collection(db, 'marcas_vales'));
        const snap = await getDocs(marcasQuery);
        
        const results: any[] = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.RUT && cleanRut(data.RUT) === cleanInputRut) {
                // Forzar conversión a Number para evitar errores en la UI
                results.push({ 
                    id: doc.id, 
                    ...data,
                    viaticos: Number(data.viaticos ?? 0),
                    diasTrabajados: Number(data.diasTrabajados ?? 0),
                    // Aseguramos consistencia en campos de mes para el filtro
                    mes: String(data.mes || data.mesPago || data.mesAsistencia || '')
                });
            }
        });

        results.sort((a, b) => b.fechaCarga?.toMillis() - a.fechaCarga?.toMillis());
        return { success: true, vales: results };
    } catch (error: any) {
        return { error: 'Error al obtener tus vales: ' + error.message };
    }
}
