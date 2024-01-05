const {
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const addPaginationComponents = (message, page, maxPage, options = {}) => {
  const { forceDisable = false } = options;

  const paginationActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("previousPage")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬅️")
      .setDisabled(forceDisable || page === 1),
    new ButtonBuilder()
      .setCustomId("pageNumber")
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${page} of ${maxPage}`)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("nextPage")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("➡️")
      .setDisabled(forceDisable || page === maxPage)
  );

  const components = message.components
    ? [...message.components, paginationActionRow]
    : [paginationActionRow];

  return {
    ...message,
    components,
  };
};

module.exports = class Pager {
  page = 1;
  current = null;
  _owner = null;
  _data = [];
  _getMessage = null;
  _cache = new Collection();

  constructor(data, getMessage, options = {}) {
    const { initialPage = 1 } = options;

    this.page = initialPage;
    this._data = data;
    this._getMessage = getMessage;
    this._replyMesage = null;
  }

  get maxPage() {
    return this._data.length;
  }

  async replyTo(interaction) {
    this.current = await this._getPageMessage(this.page, true);

    const message = addPaginationComponents(
      this.current,
      this.page,
      this.maxPage
    );

    this._owner = interaction.user.id;
    this._replyMesage = await interaction.reply(message);
    this._setListeners(this._replyMesage);
  }

  async goTo(page) {
    if (page < 1 || page > this.maxPage)
      throw new Error("Page number out of bounds");

    if (!this._replyMesage)
      throw new Error("Did not reply to any interaction yet");

    this.current = await this._getPageMessage(page);
    this.page = page;

    const message = addPaginationComponents(
      this.current,
      this.page,
      this.maxPage
    );

    this._replyMesage = await this._replyMesage.edit(message);
  }

  async next() {
    const nextPage = Math.min(this.page + 1, this.maxPage);

    this.goTo(nextPage);
  }

  async previous() {
    const previousPage = Math.max(this.page - 1, 1);

    this.goTo(previousPage);
  }

  async _getPageMessage(page, force = false) {
    if (page < 1 || page > this.maxPage)
      throw new Error("Page number out of bounds");

    if (!force) {
      // If requested page is the current page, return current message
      if (page === this.page) return this.current;

      // Check cache for already computed page message
      const cachedMessage = this._cache.get(page);
      if (cachedMessage) return cachedMessage;
    }

    // Compute page message
    const message = await this._getMessage(this._data[page - 1]);

    // Set computed page message in cache
    this._cache.set(page, message);

    return message;
  }

  _setListeners(message) {
    const buttonCollector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 1000 * 60 * 5,
      filter: (interaction) => interaction.user.id === this._owner,
    });

    // Handle button interaction
    buttonCollector.on("collect", async (interaction) => {
      await interaction.deferUpdate();

      switch (interaction.customId) {
        case "previousPage":
          await this.previous();
          break;

        case "nextPage":
          await this.next();
          break;

        default:
          return;
      }
    });

    // Disable buttons after collector times out
    buttonCollector.on("end", async () => {
      const message = addPaginationComponents(
        this.current,
        this.page,
        this.maxPage,
        { forceDisable: true }
      );

      this._replyMesage = await this._replyMesage.edit(message);
    });
  }
};
