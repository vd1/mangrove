# Goals for the walkthrough

## High-level aims

- Understand the code & architecture well enough to be able to modify the bot
- Be able to run own experiments
- Be able to create a tutorial for others

## Conrete goals for today

- Know how to run the bot - `yarn start`
- Change configuration - sort of achieved
- Observe the state of the market
  - we need to write a script
  - until then we can see the logs or Polygonscan

## Why OB filler bot

- OB filler bot is good for this as it is very simple
- The "Hello, World!" of Mangrove
- Totally off-chain currently
- Almost no "Mangrovian" stuff in it (yet)
- Can form the basis for building Mangrovian features/examples

# TODO

- Change the config for rates to reflect that the unit is "seconds"
- Make small script for printing the current order book
  - e.g `node printMarket.js DAI USDC`
- Add all revert reasons to mangrove.js, e.g. `mgv/insufficientProvision`

# Ideas

- If the book is empty, we can bootstrap by using Uniswap as a price oracle
-
