
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function checkBirthdays() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const db = getFirestore(app);
  
  const querySnapshot = await getDocs(collection(db, 'cumpleaños'));
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  
  console.log(`Fecha actual: ${currentDay}/${currentMonth + 1}`);
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const birthDateValue = data['fecha nacimiento'];
    let birthDate = null;
    
    if (birthDateValue instanceof Timestamp) {
      birthDate = birthDateValue.toDate();
    } else if (typeof birthDateValue === 'string') {
      birthDate = new Date(birthDateValue);
    }
    
    if (birthDate) {
      if (birthDate.getDate() === currentDay && birthDate.getMonth() === currentMonth) {
        console.log(`¡Cumpleaños encontrado hoy!: ${data['nombre funcionario']} (${data.correo})`);
        console.log(`Fecha aviso: ${data.fecha_aviso ? data.fecha_aviso.toDate() : 'Nunca'}`);
      }
    }
  });
}

checkBirthdays().catch(console.error);
