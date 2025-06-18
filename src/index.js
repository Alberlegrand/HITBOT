// HITBOT - WhatsApp Bot using Baileys
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

console.clear();

// Affichage du logo
try {
  console.log(chalk.green(figlet.textSync("HITBOT", { horizontalLayout: 'full' })));
} catch (err) {
  console.error(chalk.red('❌ Erreur lors de l’affichage du logo :'), err);
}

async function startBot() {
  const spinner = ora('🔄 Initialisation de HITBOT...').start();

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(chalk.blue(`📦 Version Baileys: ${version.join('.')}, dernière version: ${isLatest ? 'Oui' : 'Non'}`));

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['HITBOT', 'Chrome', '1.0.0'],
      syncFullHistory: false, // Multi-device : éviter de tout synchroniser pour aller plus vite
    });

    // 🔐 Sauvegarde des credentials automatiquement
    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error('❌ Erreur lors de la sauvegarde des identifiants :', err);
      }
    });

    // 🔗 Connexion et QR Code
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
          console.log(chalk.red('📛 Raison :'), lastDisconnect.error.message);
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
          chalk.greenBright.bold("🌟 HITBOT CONNECTÉ 🌟") +
          chalk.white("\nStatut: ") + chalk.green("Réussi ✅") +
          chalk.cyanBright("\n🎉 SUIVEZ POUR PLUS DE MISES À JOUR 🎉") +
          chalk.blue("\n📢 Canal: ") + chalk.underline.blue("https://whatsapp.com/channel/0029VaDAkV9FHWqAMMHvb40b")
        );

        try {
          await sock.sendMessage(sock.user.id, {
            text: `🌟 HITBOT CONNECTÉ 🌟\nStatut: Réussi ✅\n🎉 Merci d’utiliser HITBOT 🎉\n📢 Canal: https://whatsapp.com/channel/0029VaDAkV9FHWqAMMHvb40b`
          });
        } catch (err) {
          console.error('❌ Erreur lors de l’envoi du message de confirmation :', err);
        }
      }
    });

   // ✅ Auto-vu & réaction aux statuts avec gestion d'erreur robuste

    sock.ev.on('messages.upsert', async (update) => {
        try {
            const msg = update.messages[0];
            if (!msg || !msg.key || !msg.key.remoteJid) {
                console.warn('Message vide ou clé manquante, aucune action.');
                return;
            }

            // Vérifiez si le message vient des statuts
            if (msg.key.remoteJid === 'status@broadcast') {
                // Tableau d'emojis pour les réactions aléatoires
                const emojis = [
                    '💚', '🔥', '😊', '🎉', '👍', '💫', '🥳', '✨',
                    '😎', '🌟', '❤️', '😂', '🤔', '😅', '🙌', '👏',
                    '💪', '🤩', '🎶', '💜', '👀', '🤗', '🪄', '😋',
                    '🤝', '🥰', '😻', '🆒', '🙈', '😇', '🎈', '🥳', 
                    '🧐', '🥶', '☠️', '🤓', '🤖', '👽', '🐼', '🇭🇹'
                ];

                // Choisir un emoji aléatoire
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

                // ✅ Correction importante : enlever les options invalides qui causent EKEYTYPE
                await sock.sendMessage(
                    msg.key.remoteJid,
                    { react: { key: msg.key, text: randomEmoji } }
                );

                console.log("✅ Statut vu et réagi avec succès :", randomEmoji);
            }
        } catch (err) {
            // Gestion spécifique de l'erreur EKEYTYPE
            if (err.errorcode === 'EKEYTYPE') {
                console.error('❌ Erreur EKEYTYPE détectée (clé invalide pour node-cache)');
            } 
            // Gestion des autres erreurs éventuelles
            else {
                console.error('❌ Erreur inattendue lors de la réaction au statut :', err);
            }
        }
    });

    //Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
      try {
          const hitbot = messages[0];
          if (!hitbot || !hitbot.message || !hitbot.key || !hitbot.key.remoteJid) {
              console.warn('Message vide, message système ou clé manquante, aucune action.');
              return;
          }

          // Vérifie s'il s'agit d'un message texte classique
          if (hitbot.message.conversation) {
              const content = hitbot.message.conversation;

              const messageObj = {
                  content,
                  reply: async (text) => {
                      try {
                          await sock.sendMessage(
                              hitbot.key.remoteJid,
                              { text },
                              { quoted: hitbot }
                          );
                      } catch (err) {
                          console.error('❌ Erreur lors de l\'envoi de la réponse :', err);
                      }
                  }
              };

              // Appel vers ton handler principal (gestion des commandes, etc.)
              handleMessage(messageObj);
          }
      } catch (err) {
          console.error('❌ Erreur inattendue dans messages.upsert :', err);
      }
    });


  } catch (err) {
    spinner.fail('❌ Échec de l’initialisation de HITBOT');
    console.error('❌ Erreur globale dans startBot :', err);
  }
}

startBot();