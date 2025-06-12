export default {
  name: 'uptime',
  execute: (msg) => {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
    msg.reply(`🤖 Le bot est en ligne depuis : ${uptimeStr}`);
  }
};