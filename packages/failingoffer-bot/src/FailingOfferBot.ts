import { logger } from "./util/logger";
import Mangrove from "@giry/mangrove-js";

export class FailingOfferBot {
  #mangrove: Mangrove;

  /**
   * Constructs a FailingOffer bot.
   * @param mangrove A mangrove.js Mangrove object.
   */
  constructor(mangrove: Mangrove) {
    this.#mangrove = mangrove;
  }

  public async postOffers(): Promise<void> {
    return;
  }
}
