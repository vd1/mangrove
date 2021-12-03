This is a bot for testing the Mangrove DEX and its off-chain components, which post failing offers.

The bot posts failing offers at regular intervals and reports if they aren't cleaned within a certain timeframe.

TODO:

- Add the new bot to the CI build (with tests as needed).
- In updating the source code, tests, configuration and documentation you may look for `TODO`'s here and there, which have been placed in spots, where addition and updates are needed.

# Installation

First, clone the repo and install the prerequisites for the monorepo described in the root [README.md](../../README.md).

Next, run the following commands:

```shell
$ cd <Mangrove monorepo>/packages/failingoffer-bot
$ yarn install   # Sets up the Mangrove monorepo and installs dependencies
$ yarn build     # Builds the bot and its dependencies
```

# Usage

The JSON-RPC endpoint and private key that the bot should use must be specified in the following environment variables:

```yaml
# The URL for an Ethereum-compatible JSON-RPC endpoint
ETHEREUM_NODE_URL=<URL>
# example:
ETHEREUM_NODE_URL=https://eth-mainnet.alchemyapi.io/v2/abcd-12345679

# The private key for transaction signing
PRIVATE_KEY=<private key>
# example:
PRIVATE_KEY=0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
```

These can either be set in the environment or in a `.env*` file. The bot uses [dotenv-flow](https://github.com/kerimdzhanov/dotenv-flow) for reading `.env*` files and [.env.local.example](.env.local.example) is an example of such a file.

To start the bot, simply run

```shell
$ yarn start
```

## Configuration

The bot has a number of configurable settings.

Here's an example configuration file with instances of all possible configuration values:

```json
{
  "logLevel": "info"
}
```

- `logLevel`: Sets the logging level - the bot employs the [winston](https://github.com/winstonjs/winston) logger, and it's default log-levels.

It is possible to override parts of the configuration with environment variables. This is controlled by [./config/custom-environment-variables.json](./config/custom-environment-variables.json). The structure of this file mirrors the configuration structure but with names of environment variables in the places where these can override a part of the configuration.

# Logging

The bot logs to `console.log` using [Winston](https://github.com/winstonjs/winston). More transports can be added by editing [src/util/logger.ts](src/util/logger.ts); Please refer to the Winston documentation for details.
