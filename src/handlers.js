import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prefix = '.';

// Chargement dynamique des commandes
const commands = {};
const commandsPath = path.join(__dirname, 'commands');
for (const file of readdirSync(commandsPath)) {
  if (file.endsWith('.js')) {
    const { default: command } = await import(`./commands/${file}`);
    commands[command.name] = command.execute;
  }
}

export function handleMessage(msg, sock) {
  if (!msg.content.startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  if (commands[command]) {
    commands[command](msg, args);
  }
}