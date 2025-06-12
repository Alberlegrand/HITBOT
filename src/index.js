import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import figlet from 'figlet';
import chalk from 'chalk';
import ora from 'ora';
import { handleMessage } from './handlers.js';
import { downloadSessionData } from './sessionManager.js'; // ⬅️ Ajouté ici

console.clear();

try {
  console.log(chalk.green(figlet.textSync("HITBOT", { horizontalLayout: 'full' })));
} catch (err) {
  console.error(chalk.red('❌ Erreur logo :'), err);
}

async function startBot() {
  const spinner = ora('🔄 Initialisation de HITBOT...').start();

  try {
    // 🔐 Téléchargement de la session
    const sessionOk = await downloadSessionData();
    if (!sessionOk) {
      spinner.fail('❌ Session invalide. Impossible de continuer.');
      return;
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(chalk.blue(`📦 Baileys: ${version.join('.')}, à jour: ${isLatest ? 'Oui' : 'Non'}`));

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['HITBOT', 'Chrome', '1.0.0'],
      syncFullHistory: false
    });

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error('❌ Erreur de sauvegarde des credentials :', err);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.yellow('[QR Code] Scannez le QR pour vous connecter :'));
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const isBoom = lastDisconnect?.error instanceof Boom;
        const shouldReconnect = isBoom
          ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
          : true;

        console.log(chalk.red('❌ Déconnecté de WhatsApp'));

        if (isBoom) {
          console.log(chalk.red('📛 Raison :'), lastDisconnect.error.message);
        }

        if (shouldReconnect) {
          console.log(chalk.cyan('🔁 Reconnexion...'));
          return startBot();
        } else {
          console.log(chalk.redBright('🔒 Déconnecté définitivement.'));
        }
      } else if (connection === 'open') {
        spinner.succeed('✅ Connexion WhatsApp réussie');

        try {
          await sock.sendMessage(sock.user.id, {
            text: `🌟 HITBOT CONNECTÉ 🌟\nStatut: Réussi ✅\n🎉 Merci d’utiliser HITBOT 🎉`
          });
        } catch (err) {
          console.error('❌ Message de confirmation échoué :', err);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const hitbot = messages[0];
      if (!hitbot.message) return;

      if (hitbot.message?.conversation) {
        const messageObj = {
          content: hitbot.message.conversation,
          reply: (text) => {
            sock.sendMessage(hitbot.key.remoteJid, { text }, { quoted: hitbot });
          },
        };
        handleMessage(messageObj);
      }
    });

    // ✅ Auto-vu & réaction aux statuts
    sock.ev.on('messages.upsert', async (chatUpdate) => {
      for (const hitbot of chatUpdate.messages) {
        if (!hitbot || !hitbot.message || hitbot.key.fromMe) continue;

        // Éviter les messages système
        if (hitbot.message?.protocolMessage || hitbot.message?.ephemeralMessage || hitbot.message?.reactionMessage) continue;

        // Gestion des statuts
        if (hitbot.key.remoteJid === 'status@broadcast') {
          try {
            await sock.readMessages([hitbot.key]);

            const emojis = ['❤️', '😂', '🔥', '😍', '🥰', '😎', '👍', '🙏', '🎉', '🥳', '😄', '😅', '🤩', '💯', '👏', '😜', '😇', '🤗', '😏', '😃'];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];

            await sock.sendMessage(
              hitbot.key.remoteJid,
              {
                react: {
                  text: emoji,
                  key: hitbot.key
                }
              },
              {
                statusJidList: [hitbot.key.participant]
              }
            );

            console.log(chalk.green(`👍 Statut vu et aimé avec : ${emoji}`));
          } catch (err) {
            console.error('❌ Erreur dans la gestion des statuts :', err);
          }
        }
        } 
    });

  } catch (err) {
    spinner.fail('❌ HITBOT Échec d’initialisation');
    console.error('🔥 Erreur dans startBot :', err);
  }
}

startBot();
