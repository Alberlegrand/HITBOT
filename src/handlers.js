const prefix = '.'; // Définissez votre préfixe ici

// Exemple de commandes
const commands = {
    ping: (msg) => msg.reply('Pong!'),
    help: (msg) => msg.reply('Commandes disponibles: !ping, !help'),
    // Ajoutez d'autres commandes ici
};

export function handleMessage(msg) {
    // Vérifiez si le message commence par le préfixe
    if (!msg.content.startsWith(prefix)) return;

    // Récupérez la commande et les arguments
    const args = msg.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Exécutez la commande si elle existe
    if (commands[command]) {
        commands[command](msg, args);
    }
}