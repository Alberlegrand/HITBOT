import dotenv from 'dotenv'; dotenv.config();

import { makeWASocket, Browsers, fetchLatestBaileysVersion, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';

import express from 'express'; import fs from 'fs'; import path from 'path'; import axios from 'axios'; import chalk from 'chalk';

const app = express(); const PORT = process.env.PORT || 3000;

const sessionDir = path.join(process.cwd(), 'session'); const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

async function downloadSessionData() { if (!process.env.SESSION_ID) { console.error('SESSION_ID manquant dans .env'); return false; } const sessdata = process.env.SESSION_ID.split("ALG-MD&")[1]; const url = https://pastebin.com/raw/${sessdata}; try { const response = await axios.get(url); const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data); await fs.promises.writeFile(credsPath, data); console.log("\u{1F512} Session téléchargée et sauvegardée avec succès!"); return true; } catch (error) { console.error('Erreur lors du téléchargement de la session :', error); return false; } }

async function startBot() { const { state, saveCreds } = await useMultiFileAuthState(sessionDir); const { version, isLatest } = await fetchLatestBaileysVersion(); console.log(Version Baileys WA ${version.join('.')}, latest: ${isLatest});

const sock = makeWASocket({
    version,
    logger: undefined,
    printQRInTerminal: true,
    browser: ['ALG-MD', 'Safari', '3.0'],
    auth: state
});

sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log('Déconnexion', reason);
        if (reason !== DisconnectReason.loggedOut) startBot();
    } else if (connection === 'open') {
        console.log(chalk.green('✅ Bot connecté avec succès'));
    }
});

sock.ev.on('creds.update', saveCreds);

sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    // Gestion des statuts
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
            console.error('Erreur réaction statut:', err);
        }
    }
});

}

async function init() { if (fs.existsSync(credsPath)) { console.log("Session locale trouvée, démarrage du bot..."); await startBot(); } else { const downloaded = await downloadSessionData(); if (downloaded) { console.log("Session téléchargée, démarrage du bot..."); await startBot(); } else { console.log("Aucune session trouvée, QR code requis."); await startBot(); } } }

init();

// Serveur express basique (non obligatoire pour le bot lui-même) app.get('/', (req, res) => { res.send('Bot ALG-M

