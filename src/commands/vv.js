import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const botUser = '50944727644@s.whatsapp.net'; // Remplace avec le JID du propriétaire du bot

console.log("le proprietaire du bot : ", botUser);
export default {
  name: 'vv',
  aliases: ['rvo2', 'vv2', 'reveal2', 'antiviewonce2'], // synonymes de la commande
  description: '🔓 Révèle un média à vue unique (image, vidéo, audio) et l’envoie au propriétaire du bot',
  
  execute: async (msg, sock) => {
    try {
      /* const prefixMatch = msg.body.match(/^[\\/!#.]/);
      const prefix = prefixMatch ? prefixMatch[0] : '.';
      const cmd = msg.body.startsWith(prefix) ? msg.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

      const validCommands = ['rvo2', 'vv2', 'reveal2', 'antiviewonce2', 'viewonce2'];
      if (!validCommands.includes(cmd)) return; */

      // Vérifier si le message cité est un média à vue unique
      if (
        !msg.quoted ||
        msg.quoted.type !== 'view_once' ||
        !['imageMessage', 'videoMessage', 'audioMessage'].includes(msg.quoted.mtype)
      ) {
        console.log("Rien a faire ...")
        return; // Rien à faire si le message ne correspond pas
      }

      const mediaMsg = msg.quoted.message;
      const mediaType = Object.keys(mediaMsg)[0];
      const caption = mediaMsg[mediaType].caption || '';
      const newCaption = `${caption}\n\n> HITBOT © 2025`;

      const stream = await downloadContentFromMessage(
        mediaMsg[mediaType],
        mediaType === 'imageMessage'
          ? 'image'
          : mediaType === 'videoMessage'
          ? 'video'
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

      if (/video/.test(mediaType)) {
        await sock.sendMessage(botUser, {
          video: buffer,
          caption: newCaption,
          ...messageOptions,
        });
      } else if (/image/.test(mediaType)) {
        await sock.sendMessage(botUser, {
          image: buffer,
          caption: newCaption,
          ...messageOptions,
        });
      } else if (/audio/.test(mediaType)) {
        await sock.sendMessage(botUser, {
          audio: buffer,
          mimetype: 'audio/mp4',
          ptt: true,
          ...messageOptions,
        });
      }

      // Supprimer le message de commande après exécution
      await sock.deleteMessage(msg.from, {
        id: msg.id,
        remoteJid: msg.from,
        fromMe: true,
      });

    } catch (err) {
      console.error('❌ Erreur dans le plugin viewonce2 :', err);
    }
  }
};
