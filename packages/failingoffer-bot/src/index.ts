/**
 * This is a bot for testing the Mangrove DEX and its off-chain components, which post failing offers.
 * @module
 */

import { config } from "./util/config";
import { logger } from "./util/logger";
import { FailingOfferBot } from "./FailingOfferBot";

import Mangrove from "@giry/mangrove-js";
import { WebSocketProvider } from "@ethersproject/providers";
import { NonceManager } from "@ethersproject/experimental";
import { Wallet } from "@ethersproject/wallet";

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

  const bot = new FailingOfferBot(mgv);
};

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
