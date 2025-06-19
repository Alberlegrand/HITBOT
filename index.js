import dotenv from 'dotenv';
dotenv.config();

import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import { handleMessage } from './handlers.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';

// Paramètres serveur Express
const app = express();
const PORT = process.env.PORT || 3000;

// Chemin des sessions
const sessionDir = path.join(process.cwd(), 'session');
const credsPath = path.join(sessionDir, 'creds.json');

// Vérifie si le dossier de session existe
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Récupère le numéro du Owner depuis .env
const ownerNumber = process.env.OWNER_NUMBER || '50944727644@s.whatsapp.net';

// Fonction pour télécharger la session depuis Pastebin
async function downloadSessionData() {
  if (!process.env.SESSION_ID) {
    console.error('❌ SESSION_ID manquant dans .env');
    return false;
  }

  const parts = process.env.SESSION_ID.split('ALG-MD&');
  if (parts.length !== 2) {
    console.error('❌ SESSION_ID mal formaté.');
    return false;
  }

  const sessdata = parts[1];
  const url = `https://pastebin.com/raw/${sessdata}`;

  try {
    const response = await axios.get(url);
    const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    await fs.promises.writeFile(credsPath, data);
    console.log('🔐 Session téléchargée et sauvegardée avec succès!');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement de la session :', error.message);
    return false;
  }
}

// Fonction principale de démarrage du bot
async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📲 Version Baileys WA ${version.join('.')}, dernière version: ${isLatest}`);

    const sock = makeWASocket({
      version,
      printQRInTerminal: true,
      browser: ['ALG-MD', 'Safari', '3.0'],
      auth: state
    });

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.warn('⚠️ Déconnexion:', reason);
        if (reason !== DisconnectReason.loggedOut) {
          console.log('🔄 Tentative de reconnexion...');
          setTimeout(startBot, 5000);
        } else {
          console.error('❌ Déconnecté définitivement. Nécessite une nouvelle authentification.');
        }
      } else if (connection === 'open') {
        console.log(chalk.green('✅ Bot connecté avec succès'));

        // Envoi d’un message UI/UX au owner
        if (ownerNumber) {
          const connectionTime = new Date().toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince' });
          const message = `
━━━━━━━━━━━━━━━━━━━━━━━
🎯 *ALG-MD BOT STATUS*
━━━━━━━━━━━━━━━━━━━━━━━
✅ *Connexion réussie* à WhatsApp
📅 *Heure* : ${connectionTime}
📲 *Version Baileys* : ${version.join('.')}
🌐 *Serveur Express* : Port ${PORT}
━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot prêt à fonctionner...*
━━━━━━━━━━━━━━━━━━━━━━━
          `.trim();

          try {
            await sock.sendMessage(ownerNumber, { text: message });
            console.log("📩 Notification envoyée au owner.");
          } catch (err) {
            console.error("❌ Impossible d'envoyer le message au owner:", err.message);
          }
        }
      }
    });

    // Sauvegarde des nouvelles credentials après mise à jour
    sock.ev.on('creds.update', saveCreds);

    // Gestion des messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      if (!msg?.message) return;

      // Réaction automatique sur les statuts
      if (msg.key.remoteJid === 'status@broadcast') {
        const emojis = ['💚', '🔥', '😊', '🎉', '👍', '💫', '🥳', '✨', '😎', '🌟', '❤️', '😂', '🤔', '😅', '🙌', '👏'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        try {
          await sock.sendMessage(
            msg.key.remoteJid,
            { react: { key: msg.key, text: randomEmoji } },
            { statusJidList: [msg.key.participant, sock.user.id] }
          );
          console.log(`✅ Réaction envoyée sur statut : ${randomEmoji}`);
        } catch (err) {
          console.error("❌ Erreur lors de l'envoi de la réaction statut:", err.message);
        }
      }
    });

  } catch (err) {
    console.error('❌ Erreur critique lors du démarrage du bot:', err.message);
    process.exit(1);
  }
}

// Fonction d'initialisation
async function init() {
  try {
    if (fs.existsSync(credsPath)) {
      console.log('🔎 Session locale trouvée, démarrage du bot...');
      await startBot();
    } else {
      const downloaded = await downloadSessionData();
      if (downloaded) {
        console.log('✅ Session téléchargée, démarrage du bot...');
        await startBot();
      } else {
        console.log('🕹️ Aucune session trouvée, QR code requis.');
        await startBot();
      }
    }
  } catch (err) {
    console.error("❌ Erreur pendant l'initialisation :", err.message);
    process.exit(1);
  }
}

// Démarrage
init();

// Petit serveur express pour surveillance simple
app.get('/', (req, res) => {
  res.send('🤖 Bot ALG-MD opérationnel');
});

app.listen(PORT, () => {
  console.log(`🌐 Serveur HTTP actif sur le port ${PORT}`);
});