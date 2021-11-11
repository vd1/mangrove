// SPDX-License-Identifier:	BSD-2-Clause

// AdvancedCompoundRetail.sol

// Copyright (c) 2021 Giry SAS. All rights reserved.
pragma solidity ^0.7.0;
pragma abicoder v2;
import "../../AaveLender.sol";

interface User {}
interface Outbound is ERC20 {}
interface Inbound is ERC20 {}

contract MultiUserAaveRetail is AaveLender {
  constructor(address _addressesProvider, address payable _MGV)
    AaveLender(_addressesProvider, 0)
    MangroveOffer(_MGV)
  {}
  mapping (address => mapping (User => uint)) public deposits;

  /* outbound -> inbound -> id -> user */
  mapping (address => mapping(address => mapping(uint => address))) public owners;
  /* user -> amount */
  mapping (User => uint) provisions;


    User usr = User(msg.sender);
    uint oid = _newOffer(o,i,w,g,gr,gp,pid);
    owners[o][i][oid] = usr;
    provisions[usr] += msg.value;
  }

  function makerExecute(MgvLib.SingleOrder calldata order) external override onlyCaller(address(MGV)) returns (bytes32 ret) {
    // get the money from aave
    __get__(order.outbound_tkn,order.wants);
    // increase user deposit
    deposits[order.inbound] += order.gives;
    //
    this.withdraw(MgvLib.getOfferProvision(order.offer,order.offerDetails)) {



  }

  function withdrawToken(address tkn,address amount) {

  }

  __get__(Outbound o, w) {
    aaveretail.__get__(o,w);
    deposits
    

  }


  
   users

  // Tries to take base directly from `this` balance. Fetches the remainder on Aave.
  function __get__(IERC20 outbound_tkn, uint amount)
    internal
    virtual
    override
    returns (uint)
  {
    uint missing = MangroveOffer.__get__(outbound_tkn, amount);
    if (missing > 0) {
      return super.__get__(outbound_tkn, missing);
    }
    return 0;
  }
}
