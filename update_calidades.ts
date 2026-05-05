import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load config - we need to make sure this works with ts-node
import { firebaseConfig } from './firebase/config';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig, 'script-update');
const db = getFirestore(app);

async function main() {
    console.log("Reading rut_calidades.json...");
    const rawData = fs.readFileSync(path.join(__dirname, 'rut_calidades.json'), 'utf8');
    const calidadesMap: Record<string, string> = JSON.parse(rawData);

    console.log("Fetching funcionarios_vales from Firestore...");
    const q = query(collection(db, 'funcionarios_vales'));
    const snapshot = await getDocs(q);

    let updated = 0;
    let notFound = 0;

    console.log(`Found ${snapshot.size} funcionarios in DB.`);

    const promises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (!data.RUT) return;

        // Clean RUTs for comparison
        const rutDb = String(data.RUT).toUpperCase().trim();
        const rutDbClean = rutDb.replace(/[^0-9K]/g, '');

        // Find match in our map
        let matchedCalidad = null;
        for (const [key, value] of Object.entries(calidadesMap)) {
            const keyClean = String(key).toUpperCase().replace(/[^0-9K]/g, '');
            if (keyClean === rutDbClean) {
                matchedCalidad = value;
                break;
            }
        }

        if (matchedCalidad) {
            await updateDoc(doc(db, 'funcionarios_vales', docSnap.id), {
                calidadContractual: matchedCalidad
            });
            updated++;
        } else {
            // Default to 'T' if not found? Or leave empty? Let's leave empty so we can fallback in the logic.
            notFound++;
        }
    });

    await Promise.all(promises);

    console.log(`Update complete. Updated: ${updated}. Not found in JSON: ${notFound}.`);
    process.exit(0);
}

main().catch(console.error);
