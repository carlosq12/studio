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

export async function updateUser(uid: string, data: { nombres?: string, apellidos?: string, email?: string, rut?: string }) {
    if (!uid) return { error: 'ID de usuario no proporcionado.' };

    try {
        const userRef = doc(db, 'usuarios_funcionarios', uid);
        await updateDoc(userRef, data);
        return { success: true };
    } catch (error: any) {
        console.error("Error al actualizar usuario:", error);
        return { error: 'No se pudo actualizar el usuario: ' + error.message };
    }
}

export async function deleteUser(uid: string) {
    if (!uid) return { error: 'ID de usuario no proporcionado.' };

    try {
        const { deleteDoc } = require('firebase/firestore');
        const userRef = doc(db, 'usuarios_funcionarios', uid);
        await deleteDoc(userRef);
        return { success: true };
    } catch (error: any) {
        console.error("Error al eliminar usuario:", error);
        return { error: 'No se pudo eliminar el usuario: ' + error.message };
    }
}
