import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const botUser = '50944727644@s.whatsapp.net'; // Remplace avec le JID du propriétaire du bot

console.log("🔧 Le propriétaire du bot est :", botUser);

export default {
  name: 'vv',
  aliases: ['rvo2', 'vv2', 'reveal2', 'antiviewonce2'],
  description: '🔓 Révèle un média à vue unique (image, vidéo, audio) et l’envoie au propriétaire du bot',

  execute: async (msg, sock) => {
    try {
      console.log("⚙️ Exécution de la commande 'vv'...");

      await sock.sendMessage(msg.from, { text: "🔍 Analyse du message cité en cours..." });

      if (
        !msg.quoted ||
        msg.quoted.type !== 'view_once' ||
        !['imageMessage', 'videoMessage', 'audioMessage'].includes(msg.quoted.mtype)
      ) {
        console.log("ℹ️ Aucun média à vue unique détecté.");
        await sock.sendMessage(msg.from, { text: "❌ Ce n'est pas un média à vue unique valide." });
        return;
      }

      console.log("📥 Téléchargement du média...");
      await sock.sendMessage(msg.from, { text: "📥 Téléchargement du média en cours..." });

      const mediaMsg = msg.quoted.message;
Type = Object.keys(mediaMsg)[0];
      const caption = mediaMsg[mediaType].caption || '';
      const newCaption = `${caption}\n\n> HITBOT © 2025`;

      const stream = await downloadContentFromMessage(
        mediaMsg[mediaType],
        mediaType === 'imageMessage' ? 'image'
        : mediaType === 'videoMessage' ? 'video'
        : 'audio'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const messageOptions = {
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: false,
        },
      };

      console.log("📤 Envoi au propriétaire...");
      await sock.sendMessage(msg.from, { text: "📤 Envoi du média au propriétaire..." });

      if (/video/.test(mediaType)) {
        await sock.sendMessage(botUser, { video: buffer, caption: newCaption, ...messageOptions });
      } else if (/image/.test(mediaType)) {
        await sock.sendMessage(botUser, { image: buffer, caption: newCaption, ...messageOptions });
      } else if (/audio/.test(mediaType)) {
        await sock.sendMessage(botUser, { audio: buffer, mimetype: 'audio/mp4', ptt: true, ...messageOptions });
      }

      console.log("✅ Message transmis et commande traitée.");
      await sock.sendMessage(msg.from, { text: "✅ Média révélé et transféré avec succès !" });

      await sock.deleteMessage(msg.from, {
        id: msg.id,
        remoteJid: msg.from,
        fromMe: true,
      });

    } catch (err) {
      console.error("❌ Erreur dans le plugin 'vv' :", err);
      await sock.sendMessage(msg.from, {
        text: `❌ Une erreur est survenue : ${err.message || err}`,
      });
    }
  }
};