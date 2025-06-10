// src/index.js

import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import figlet from 'figlet';
import chalk from 'chalk';
import ora from 'ora';
import { handleMessage } from './handlers.js';

console.clear();

try {
  console.log(chalk.green(figlet.textSync("HITBOT", { horizontalLayout: 'full' })));
} catch (err) {
  console.error(chalk.red('❌ Erreur lors de l’affichage du logo :'), err);
}

async function startBot() {
  const spinner = ora('Initialisation de HITBOT...').start();

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
      auth: state,
      browser: ['HITBOT', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error('❌ Erreur lors de la sauvegarde des identifiants :', err);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            console.log(chalk.yellow('[QR Code] Scannez ce QR pour vous connecter à WhatsApp :'));
            qrcode.generate(qr, { small: true });
          } catch (err) {
            console.error('❌ Erreur d’affichage du QR Code :', err);
          }
        }

        if (connection === 'close') {
          const isBoom = lastDisconnect?.error instanceof Boom;
          const shouldReconnect = isBoom
            ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
            : true;

          console.log(chalk.red('❌ Déconnecté de WhatsApp'));
          if (isBoom) {
            console.log(chalk.red('Raison :'), lastDisconnect.error.message);
          }

          if (shouldReconnect) {
            console.log(chalk.cyan('🔁 Tentative de reconnexion...'));
            return startBot();
          } else {
            console.log(chalk.redBright('🔒 Déconnecté définitivement. Re-scan du QR nécessaire.'));
          }

        } else if (connection === 'open') {
          spinner.succeed('✅ Connexion réussie à WhatsApp');

          console.log(
            chalk.greenBright.bold("🌟 HITBOT CONNECTED 🌟") +
            chalk.white("\nStatus: ") + chalk.green("Successful ✅") +
            chalk.cyanBright("\n🎉 JOIN FOR MORE UPDATES 🎉") +
            chalk.blue("\n📢 Channel: ") + chalk.underline.blue("https://whatsapp.com/channel/0029VaDAkV9FHWqAMMHvb40b")
          );

          try {
            await sock.sendMessage(sock.user.id, {
              text: `🌟 HITBOT CONNECTED 🌟\nStatus: Successful ✅\n🎉 Merci d’utiliser HITBOT 🎉\n📢 Rejoignez notre canal: https://whatsapp.com/channel/0029VaDAkV9FHWqAMMHvb40b`
            });
          } catch (err) {
            console.error('❌ Erreur lors de l’envoi du message de confirmation :', err);
          }
        }

      } catch (err) {
        console.error('❌ Erreur dans connection.update :', err);
      }
    });

    // ✅ Réaction auto statuts
    sock.ev.on('messages.upsert', async (chatUpdate) => {
      try {
        const alg = chatUpdate.messages[0];
        const fromJid = alg.key.participant || alg.key.remoteJid;

        // Vérifications de sécurité
        if (!alg || !alg.message || alg.key.fromMe) return;
        if (alg.message?.protocolMessage || alg.message?.ephemeralMessage || alg.message?.reactionMessage) return;

        // Si c'est un statut WhatsApp
        if (alg.key && alg.key.remoteJid === 'status@broadcast') {
          // Marquer comme lu
          await sock.readMessages([alg.key]);

          // Choisir un emoji à envoyer en réaction (❤️ ici, ou remplace par un autre)
            const emojis = ['❤️', '😂', '🔥', '😍', '🥰', '😎', '👍', '🙏', '🎉', '🥳', '😄', '😅', '🤩', '💯', '👏', '😜', '😇', '🤗', '😏', '😃'];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];

          // Envoyer la réaction (like du statut)
          await sock.sendMessage(
            alg.key.remoteJid,
            {
              react: {
                text: emoji,
                key: alg.key
              }
            },
            {
              statusJidList: [alg.key.participant]
            }
          );

          // Log (optionnel)
          console.log(chalk.green('👍 Statut vu et aimé avec une réaction.'));
        }

      } catch (err) {
        console.error('❌ Erreur dans la gestion des statuts (auto seen & like) :', err);
      }
    });


    // ✅ Commande ping -> pong
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      if (!messages || !messages[0]) return;

      const msg = messages[0];
      if (msg.key.fromMe) return;
      if (!msg.message?.conversation) return;

      // Adapter le format du message pour le handler
      const messageObj = {
        content: msg.message.conversation,
        reply: (text) => sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg }),
      };

      handleMessage(messageObj);
    });

  } catch (err) {
    spinner.fail('❌ Échec de l’initialisation de HITBOT');
    console.error('❌ Erreur globale dans startBot :', err);
  }
}

startBot();
