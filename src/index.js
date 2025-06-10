// src/index.js

import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import figlet from 'figlet';
import chalk from 'chalk';
import ora from 'ora';

console.clear();

console.log(
  chalk.green(figlet.textSync("HITBOT", { horizontalLayout: 'full' }))
);

async function startBot() {
  const spinner = ora('Initialisation de HITBOT...').start();
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    browser: ['HITBOT', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(chalk.yellow('[QR Code] Scannez ce QR pour vous connecter à WhatsApp :'));
      qrcode.generate(qr, { small: true });
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

      // Message de confirmation
      await sock.sendMessage(sock.user.id, {
        text: `🌟 HITBOT CONNECTED 🌟\nStatus: Successful ✅\n🎉 Merci d’utiliser HITBOT 🎉\n📢 Rejoignez notre canal: https://whatsapp.com/channel/0029VaDAkV9FHWqAMMHvb40b`
      });
    }
  });

  // ✅ Réaction automatique aux statuts
  /* sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (!messages || !messages[0]) return;

    const msg = messages[0];

    if (msg.key.remoteJid === 'status@broadcast') {
        const me = await sock.user.id;
      const emojis = [
        '💚', '🔥', '😊', '🎉', '👍', '💫', '🥳', '✨', '😎', '🌟', '❤️', '😂', '🤔', '😅',
        '🙌', '👏', '💪', '🤩', '🎶', '💜', '👀', '🤗', '🪄', '😋', '🤝', '🥰', '😻',
        '🆒', '🙈', '😇', '🎈', '🧐', '🥶', '☠️', '🤓', '🤖', '👽', '🐼', '🇭🇹'
      ];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];

       // Envoyer la réaction
                await sock.sendMessage(
                    msg.key.remoteJid,
                    { react: { key: msg.key, text: emoji } },
                    { statusJidList: [msg.key.participant, me] }
                );
                console.log(" Stauts react :", me);
    }
  }); */
  

  sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const alg = chatUpdate.messages[0];
                const fromJid = alg.key.participant || alg.key.remoteJid;
                if (!alg || !alg.message) return;
                if (alg.key.fromMe) return;
                if (alg.message?.protocolMessage || alg.message?.ephemeralMessage || alg.message?.reactionMessage) return;
                if (alg.key && alg.key.remoteJid === 'status@broadcast') {
                    await sock.readMessages([alg.key]);


                        const customMessage = '✅ Auto Status Seen Bot By HITBOT';
                        await sock.sendMessage(fromJid, { text: customMessage }, { quoted: alg });
                    
                }
            } catch (err) {
                console.error('Error handling messages.upsert event:', err);
            }
        });

  // ✅ Commande ping -> pong
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (messageContent?.toLowerCase() === 'ping') {
      await sock.sendMessage(from, { text: 'pong 🏓' });
    }
  });
}

startBot();
