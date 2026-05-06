'use server';

import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const app = getApps().find(app => app.name === 'server-actions-usuarios-vales') || initializeApp(firebaseConfig, 'server-actions-usuarios-vales');
const db = getFirestore(app);

export async function changeUserStatus(uid: string, newStatus: 'Aprobado' | 'Rechazado' | 'Pendiente') {
    if (!uid) return { error: 'ID de usuario no proporcionado.' };

    try {
        const userRef = doc(db, 'usuarios_funcionarios', uid);
        await updateDoc(userRef, {
            estado: newStatus
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error al actualizar estado del usuario:", error);
        return { error: 'No se pudo actualizar el estado: ' + error.message };
    }
}
