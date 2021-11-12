// SPDX-License-Identifier:	AGPL-3.0

pragma solidity ^0.7.0;
pragma abicoder v2;
import "../../AbstractMangrove.sol";
import "./OfferManager.sol";
import "../../Strategies/interfaces/Aave/ILendingPool.sol";

contract GreedyTaker is ITaker {
  AbstractMangrove mgv;
  IERC20 outboundTkn;
  IERC20 inboundTkn;
  ILendingPool lendingPool;

  constructor(
    AbstractMangrove _mgv,
    IERC20 _outboundTkn,
    IERC20 _inboundTkn,
    ILendingPool _lendingPool
  ) {
    mgv = _mgv;
    outboundTkn = _outboundTkn;
    inboundTkn = _inboundTkn;
    lendingPool = _lendingPool;
  }

  receive() external payable {}

  function approveMgv() external {
    inboundTkn.approve(address(mgv), type(uint).max);
  }

  function callback(
    uint offerId,
    uint takerWants,
    uint takerGives,
    uint gasreq
  ) external {
    mgv.snipe(
      mgv,
      outboundTkn,
      inboundTkn,
      offerId,
      takerWants,
      takerGives,
      gasreq
    );
  }

  function shoot(uint offerId, uint takerWants)
    external
    returns (bool success)
  {}

  function snipe(
    AbstractMangrove __mgv,
    address __base,
    address __quote,
    uint offerId,
    uint takerWants,
    uint takerGives,
    uint gasreq
  ) public returns (bool) {
    uint[4][] memory targets = new uint[4][](1);
    targets[0] = [offerId, takerWants, takerGives, gasreq];
    (uint successes, , ) = __mgv.snipes(__base, __quote, targets, true);
    return successes == 1;
  }
}
