/**
 * This is a bot for testing the Mangrove DEX and its off-chain components, which post failing offers.
 * @module
 */

import { config, getConfigValue } from "./util/config";
import { logger } from "./util/logger";
import { FailingOfferBot } from "./FailingOfferBot";

import Mangrove from "@giry/mangrove-js";
import { WebSocketProvider } from "@ethersproject/providers";
import { NonceManager } from "@ethersproject/experimental";
import { Wallet } from "@ethersproject/wallet";

import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";

type BotConfig = {
  runEveryXMinutes: number;
};

const scheduler = new ToadScheduler();

const main = async () => {
  logger.info("Starting failingoffer-bot...");

  // read and use env config
  if (!process.env["ETHEREUM_NODE_URL"]) {
    throw new Error("No URL for a node has been provided in ETHEREUM_NODE_URL");
  }
  if (!process.env["PRIVATE_KEY"]) {
    throw new Error("No private key provided in PRIVATE_KEY");
  }
  const provider = new WebSocketProvider(process.env["ETHEREUM_NODE_URL"]);
  const signer = new Wallet(process.env["PRIVATE_KEY"], provider);
  const nonceManager = new NonceManager(signer);
  const mgv = await Mangrove.connect({ signer: nonceManager });

  logger.info("Connected to Mangrove", {
    data: {
      network: mgv._network,
      addresses: Mangrove.getAllAddresses(mgv._network.name),
    },
  });

  const botConfig: BotConfig = readAndValidateConfig();

  const bot = new FailingOfferBot(mgv);

  // create and schedule task
  logger.info(`Running bot every ${botConfig.runEveryXMinutes} minutes.`);

  const task = new AsyncTask(
    "failingoffer-bot task",
    async () => {
      const blockNumber = await mgv._provider.getBlockNumber().catch((e) => {
        logger.debug("Error on getting blockNumber via ethers", { data: e });
        return -1;
      });

      logger.verbose(`Scheduled bot task running on block ${blockNumber}...`);
      await exitIfMangroveIsKilled(mgv, blockNumber);
      await bot.postOffers();
    },
    (err: Error) => {
      logErrorAndExit(err);
    }
  );

  const job = new SimpleIntervalJob(
    {
      minutes: botConfig.runEveryXMinutes,
      runImmediately: true,
    },
    task
  );

  scheduler.addSimpleIntervalJob(job);
};

// NOTE: Almost equal to method in cleanerbot - commonlib candidate
async function exitIfMangroveIsKilled(
  mgv: Mangrove,
  blockNumber: number
): Promise<void> {
  const globalConfig = await mgv.config();
  if (globalConfig.dead) {
    logger.warn(
      `Mangrove is dead at block number ${blockNumber}. Stopping the bot.`
    );
    process.exit();
  }
}

function readAndValidateConfig(): BotConfig {
  const configErrors: string[] = [];

  let runEveryXMinutes = 0;

  const runEveryXMinutesConfig = getConfigValue<number>("runEveryXMinutes");
  switch (runEveryXMinutesConfig._tag) {
    case "FoundConfigValue":
      runEveryXMinutes = runEveryXMinutesConfig.value;
      break;
    case "ConfigError":
      configErrors.push(runEveryXMinutesConfig.errorMessage);
      break;
  }

  if (configErrors.length > 0) {
    throw new Error(
      `Found following config errors: [${configErrors.join(", ")}]`
    );
  }

  return {
    runEveryXMinutes: runEveryXMinutes,
  };
}

function logErrorAndExit(err: Error) {
  logger.exception(err);
  process.exit(1);
}

process.on("unhandledRejection", function (reason, promise) {
  logger.warn("Unhandled Rejection", { data: reason });
});

main().catch((e) => {
  logErrorAndExit(e);
});
