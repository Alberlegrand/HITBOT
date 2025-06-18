import axios from 'axios';
import fs from 'fs';
import config from './config.js'; // adapte selon ton projet

const credsPath = './auth_info/creds.json'; // ou selon ton système

export async function downloadSessionData() {
    if (!config.SESSION_ID) {
        console.error('❌ SESSION_ID manquant dans .env');
        return false;
    }

    const sessdata = config.SESSION_ID.split("HITBOT&")[1];
    if (!sessdata) {
        console.error('❌ Format SESSION_ID invalide. Il doit contenir HITBOT&<id>');
        return false;
    }

    const url = `https://pastebin.com/raw/${sessdata}`;
    console.log('🔗 URL vers la session :', url);

    try {
        const response = await axios.get(url);
        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        // S'assurer que le dossier auth_info existe
        await fs.promises.mkdir('./auth_info', { recursive: true });

        // Écrit la session
        await fs.promises.writeFile(credsPath, data);
        console.log('🔐 Session téléchargée avec succès !');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors du téléchargement de la session :', error.message);
        return false;
    }
}
