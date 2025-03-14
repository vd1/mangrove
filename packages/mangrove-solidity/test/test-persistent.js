const { assert } = require("chai");
//const { parseToken } = require("ethers/lib/utils");
const { ethers, env, mangrove, network } = require("hardhat");
const lc = require("../lib/libcommon.js");
const chalk = require("chalk");

let testSigner = null;

describe("Running tests...", function () {
  this.timeout(200_000); // Deployment is slow so timeout is increased
  let mgv = null;
  let reader = null;
  let dai = null;
  let usdc = null;
  let wEth = null;
  let cwEth = null;
  let cDai = null;
  let cUsdc = null;

  before(async function () {
    // fetches all token contracts
    dai = await lc.getContract("DAI");
    wEth = await lc.getContract("WETH");
    usdc = await lc.getContract("USDC");
    cwEth = await lc.getContract("CWETH");
    cUsdc = await lc.getContract("CUSDC");
    cDai = await lc.getContract("CDAI");

    // setting testRunner signer
    [testSigner] = await ethers.getSigners();

    // deploying mangrove and opening WETH/USDC market.
    [mgv, reader] = await lc.deployMangrove();
    await lc.activateMarket(mgv, wEth.address, usdc.address);
    await lc.activateMarket(mgv, wEth.address, dai.address);
    await lc.activateMarket(mgv, usdc.address, dai.address);
  });

  it("Swinging strat", async function () {
    lc.listenMgv(mgv);

    const strategy = "SwingingMarketMaker";
    const Strat = await ethers.getContractFactory(strategy);
    const comp = await lc.getContract("COMP");

    // deploying strat
    const makerContract = (
      await Strat.deploy(comp.address, mgv.address, wEth.address)
    ).connect(testSigner);
    lc.listenOfferLogic(makerContract, ["PosthookFail"]);
    const eth_for_one_usdc = lc.parseToken("0.0004", 18); // 1/2500 ethers
    const usdc_for_one_eth = lc.parseToken("2510", 6); // 2510 $

    // setting p(WETH|USDC) and p(USDC|WETH) s.t p(WETH|USDC)*p(USDC|WETH) > 1
    await makerContract.setPrice(wEth.address, usdc.address, eth_for_one_usdc);
    await makerContract.setPrice(usdc.address, wEth.address, usdc_for_one_eth);

    // taker premices (approving Mgv on inbound erc20 for taker orders)
    // 1. test runner will need to sell weth and usdc so getting some...
    await lc.fund([
      ["WETH", "1000.0", testSigner.address],
      ["USDC", "1000000.0", testSigner.address],
    ]);
    // 2. sending WETH and USDC to mangrove requires approval
    await wEth
      .connect(testSigner)
      .approve(mgv.address, ethers.constants.MaxUint256);
    await usdc
      .connect(testSigner)
      .approve(mgv.address, ethers.constants.MaxUint256);

    // maker premices

    //1. approve lender for c[DAI|WETH|USDC] minting
    await makerContract.approveLender(
      cwEth.address,
      ethers.constants.MaxUint256
    );
    await makerContract.approveLender(
      cUsdc.address,
      ethers.constants.MaxUint256
    );
    await makerContract.approveLender(
      cDai.address,
      ethers.constants.MaxUint256
    );

    // 2. entering markets to be allowed to borrow USDC and WETH on DAI collateral
    await makerContract.enterMarkets([cwEth.address]);
    await makerContract.enterMarkets([cUsdc.address]);
    await makerContract.enterMarkets([cDai.address]);

    // 3. pushing DAIs on compound to be used as collateral
    // 3.1 sending DAIs to makerContract to be used as collateral
    await lc.fund([["DAI", "100000.0", makerContract.address]]);
    // 3.2 asking maker contract to mint cDAIs
    const daiAmount = lc.parseToken("100000.0", 18);
    await makerContract.mint(daiAmount, cDai.address, makerContract.address);

    // starting strategy by offering 1000 USDC on the book
    const overrides = { value: lc.parseToken("2.0", 18) };
    const gives_amount = lc.parseToken("1000.0", 6);
    await makerContract.startStrat(
      usdc.address,
      wEth.address,
      gives_amount,
      overrides
    ); // gives 1000 $

    await lc.logLenderStatus(
      makerContract,
      "compound",
      ["WETH"],
      makerContract.address
    );

    for (let i = 0; i < 10; i++) {
      let book01 = await reader.offerList(usdc.address, wEth.address, 0, 1);
      let book10 = await reader.offerList(wEth.address, usdc.address, 0, 1);
      await lc.logOrderBook(book01, usdc, wEth);
      await lc.logOrderBook(book10, wEth, usdc);

      // market order
      let takerGot;
      let takerGave;
      if (i % 2 == 0) {
        // every even events, taker buys USDC
        [takerGot, takerGave] = await lc.marketOrder(
          mgv,
          "USDC",
          "WETH",
          lc.parseToken("1000", await usdc.decimals()), //takerWants
          lc.parseToken("1.0", 18) //takerGives
        );
        console.log(
          chalk.green(lc.formatToken(takerGot, 6)),
          chalk.red(lc.formatToken(takerGave, 18))
        );
      } else {
        // every odd events taker buys WETH
        [takerGot, takerGave] = await lc.marketOrder(
          mgv,
          "WETH",
          "USDC",
          lc.parseToken("0.4", 18), //takerWants
          lc.parseToken("2000", await usdc.decimals()) //takerGives
        );
        console.log(
          chalk.green(lc.formatToken(takerGot, 18)),
          chalk.red(lc.formatToken(takerGave, 6))
        );
      }
    }
    await lc.logLenderStatus(
      makerContract,
      "compound",
      ["USDC", "WETH"],
      makerContract.address
    );
    lc.sleep(5000);
    lc.stopListeners([mgv, makerContract]);
  });

  //   it("Reposting strat", async function () {
  //     const Repost = await ethers.getContractFactory("Reposting");

  //     // deploying strat
  //     const repostLogic = (await Repost.deploy(mgv.address)).connect(testSigner);
  //     const signerAddr = await testSigner.getAddress();

  //     await lc.fund([
  //       ["DAI", "100000.0", repostLogic.address],
  //       ["DAI", "100000.0", signerAddr],
  //       ["WETH", "100.0", repostLogic.address],
  //       ["WETH", "100.0", signerAddr],
  //       ["USDC", "100000.0", repostLogic.address],
  //       ["USDC", "100000.0", signerAddr],
  //     ]);

  //     const tokenParams = [
  //       [wEth.connect(testSigner), "WETH", 18, ethers.utils.parseEther("1")],
  //       [dai.connect(testSigner), "DAI", 18, ethers.utils.parseEther("0.0003")],
  //       [usdc.connect(testSigner), "USDC", 6, ethers.utils.parseEther("0.0003")],
  //     ];

  //     const ofr_gasreq = ethers.BigNumber.from(500000);
  //     const ofr_gasprice = ethers.BigNumber.from(0);
  //     const ofr_pivot = ethers.BigNumber.from(0);

  //     const usdToNative = ethers.utils.parseEther("0.0003");

  //     let overrides = { value: ethers.utils.parseEther("1.0") };
  //     await mgv["fund(address)"](repostLogic.address, overrides);

  //     // taker side actions
  //     for (const [token] of tokenParams) {
  //       await token.approve(mgv.address, ethers.constants.MaxUint256);
  //     }

  //     lc.listenMgv(mgv);

  //     for (const [
  //       outbound_tkn,
  //       outName,
  //       outDecimals,
  //       outTknInMatic,
  //     ] of tokenParams) {
  //       const tx = await repostLogic.approveMangrove(
  //         outbound_tkn.address,
  //         ethers.constants.MaxUint256
  //       );
  //       await tx.wait();

  //       for (const [
  //         inbound_tkn,
  //         inName,
  //         inDecimals,
  //         inTknInMatic,
  //       ] of tokenParams) {
  //         if (outbound_tkn.address != inbound_tkn.address) {
  //           const makerWants = ethers.utils
  //             .parseUnits("1000", inDecimals)
  //             .mul(usdToNative)
  //             .div(inTknInMatic); // makerWants
  //           const makerGives = ethers.utils
  //             .parseUnits("1000", outDecimals)
  //             .mul(usdToNative)
  //             .div(outTknInMatic); // makerGives

  //           const ofrTx = await repostLogic.newOffer(
  //             outbound_tkn.address, //e.g weth
  //             inbound_tkn.address, //e.g dai
  //             makerWants,
  //             makerGives,
  //             ofr_gasreq,
  //             ofr_gasprice,
  //             ofr_pivot
  //           );
  //           await ofrTx.wait();

  //           const book = await reader.offerList(
  //             outbound_tkn.address,
  //             inbound_tkn.address,
  //             ethers.BigNumber.from(0),
  //             ethers.BigNumber.from(1)
  //           );
  //           lc.logOrderBook(book, outbound_tkn, inbound_tkn);
  //           const tx = await mgv.marketOrder(
  //             outbound_tkn.address,
  //             inbound_tkn.address,
  //             makerGives,
  //             makerWants,
  //             true
  //           );
  //           tx.wait();
  //           lc.logOrderBook(book, outbound_tkn, inbound_tkn);
  //         }
  //       }
  //     }
  //     lc.sleep(5000);
  //     lc.stopListeners([mgv]);
  //   });
});

// const usdc_decimals = await usdc.decimals();
// const filter_PosthookFail = mgv.filters.PosthookFailure();
// mgv.once(filter_PosthookFail, (
//   outbound_tkn,
//   inbound_tkn,
//   offerId,
//   makerData,
//   event) => {
//     let outSym;
//     let inSym;
//     if (outbound_tkn == wEth.address) {
//       outSym = "WETH";
//       inSym = "USDC";
//     } else {
//       outSym = "USDC";
//       inSym = "WETH";
//     }
//     console.log(`Failed to repost offer #${offerId} on (${outSym},${inSym}) Offer List`);
//     console.log(ethers.utils.parseBytes32String(makerData));
//   }
// );
// const filter_MangroveFail = mgv.filters.OfferFail();
// mgv.once(filter_MangroveFail, (
//   outbound_tkn,
//   inbound_tkn,
//   offerId,
//   taker_address,
//   takerWants,
//   takerGives,
//   statusCode,
//   makerData,
//   event
//   ) => {
//     let outDecimals;
//     let inDecimals;
//     if (outbound_tkn == wEth.address) {
//       outDecimals = 18;
//       inDecimals = usdc_decimals;
//     } else {
//       outTkn = usdc_decimals;
//       inTkn = 18;
//     }
//   console.warn("Contract failed to execute taker order. Offer was: ", outbound_tkn, inbound_tkn, offerId);
//   console.warn("Order was ",
//   lc.formatToken(takerWants, outDecimals),
//   lc.formatToken(takerGives, inDecimals)
//   );
//   console.warn(ethers.utils.parseBytes32String(statusCode));
// });
// const filterContractLiquidity = makerContract.filters.NotEnoughLiquidity();
// makerContract.once(filterContractLiquidity, (outbound_tkn, missing, event) => {
//   let outDecimals;
//   let symbol;
//   if (outbound_tkn == wEth.address) {
//     outDecimals = 18;
//     symbol = "WETH";
//   } else {outDecimals = usdc_decimals; symbol = "USDC";}
//   console.warn ("could not fetch ",lc.formatToken(missing,outDecimals),symbol);
// }
// );

// const filterContractRepay = makerContract.filters.ErrorOnRepay();
// makerContract.once(filterContractRepay, (inbound_tkn, toRepay, errCode, event) => {
//   let inDecimals;
//   let symbol;
//   if (inbound_tkn == wEth.address) {
//     inDecimals = 18;
//     symbol = "WETH";
//   } else {inDecimals = usdc_decimals; symbol = "USDC";}
//   console.warn ("could not repay ",lc.formatToken(toRepay,inDecimals),symbol);
//   console.warn (errCode.toString());
// });
