const { default: axios, isAxiosError } = require("axios");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { getErrorEmbed } = require("../../utils/embed");

const Pager = require("../../utils/pagination");

const WORD_REGEX = /^[A-Za-z-]+$/;
module.exports = {
  data: new SlashCommandBuilder()
    .setName("word")
    .setDescription("test")
    .addStringOption((option) =>
      option.setName("word").setDescription("test").setRequired(true)
    ),

  handler: async (interaction) => {
    const word = interaction.options.getString("word");

    if (!WORD_REGEX.test(word))
      await interaction.reply({
        embeds: [getErrorEmbed(`"${word}" is not a valid word!`)],
      });

    let res;
    try {
      res = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
    } catch (error) {
      console.error(error);

      if (!isAxiosError(error)) {
        await interaction.reply({
          embeds: [getErrorEmbed("Something went wrong, try again later!")],
        });
        return;
      }

      switch (error.response.status) {
        case 404: {
          await interaction.reply({
            embeds: [
              getErrorEmbed(
                `Could not find any definition for word "${word}"!`
              ),
            ],
          });
          break;
        }

        default: {
          await interaction.reply({
            embeds: [getErrorEmbed("Something went wrong, try again later!")],
          });
        }
      }
      return;
    }

    const definitions = [];
    for (const result of res.data) {
      const { word, phonetic } = result;
      const general = {
        word,
        phonetic: phonetic,
      };

      for (const _meaning of result.meanings) {
        const { partOfSpeech, synonyms, antonyms } = _meaning;

        const meaning = {
          partOfSpeech,
          synonyms,
          antonyms,
        };

        for (const _definition of _meaning.definitions) {
          const { definition, example } = _definition;

          definitions.push({
            general,
            meaning,
            definition,
            example,
          });
        }
      }
    }

    const pager = new Pager(definitions, (definition) => {
      const fields = [];

      if (definition.example)
        fields.push({
          name: "Example",
          value: definition.example,
        });

      if (definition.meaning?.synonyms?.length)
        fields.push({
          name: "Synonyms",
          value: definition.meaning.synonyms.slice(0, 3).join(", "),
          inline: true,
        });

      if (definition.meaning?.antonyms?.length)
        fields.push({
          name: "Antonyms",
          value: definition.meaning.antonyms.slice(0, 3).join(", "),
          inline: true,
        });

      return {
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `${definition.general.word} (${definition.meaning.partOfSpeech}) - ${definition.general.phonetic}`
            )
            .setDescription(definition.definition)
            .setFields(fields),
        ],
      };
    });

    try {
      await pager.replyTo(interaction);
    } catch (error) {
      console.error(error);

      await interaction.reply({
        embeds: [getErrorEmbed("Something went wrong, try again later!")],
      });
    }
  },
};
