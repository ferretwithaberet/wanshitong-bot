const { EmbedBuilder } = require("discord.js");

const getErrorEmbed = (message, options = {}) => {
  const { title = "Error!" } = options;

  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle(title)
    .setDescription(message);
};

module.exports = {
  getErrorEmbed,
};
