const wordCommand = require("./word");

module.exports = [wordCommand].reduce(
  (commands, command) => ({
    ...commands,
    [command.data.name]: command,
  }),
  {}
);
