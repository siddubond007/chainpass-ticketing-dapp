# ChainPass — Decentralized Event Ticketing Platform

A full-stack Ethereum DApp built as a Blockchain Development Capstone Project. ChainPass eliminates ticket counterfeiting and intermediary fees by managing event creation, ticket minting, peer-to-peer transfers, and gate verification directly through Solidity smart contracts.

## Tech Stack
- **Smart Contracts:** Solidity (`0.8.19`), Truffle, Ganache
- **Frontend:** React (Vite), Web3.js, MetaMask
- **Testing:** Mocha & Chai (`truffle test`)

## Key Features
- **On-Chain Event Creation:** Organizers publish events with fixed ticket capacities and ETH pricing.
- **Tamper-Proof Ticketing:** Each purchased ticket is recorded immutably on-chain and tied to the buyer's wallet.
- **Peer-to-Peer Transfers:** Attendees can transfer valid tickets directly to another wallet address.
- **Gate Verification:** Event organizers can look up any Ticket ID and mark it as checked-in to prevent duplicate entry.
- **Security Best Practices:** Implements a Reentrancy Guard, Checks-Effects-Interactions, and Pull-over-Push revenue withdrawals.

## Local Setup
1. Start **Ganache** on `http://127.0.0.1:7545`.
2. Deploy contracts: `truffle migrate --reset`
3. Run tests: `truffle test`
4. Launch frontend: `cd client && npm install && npm run dev`
5. Connect **MetaMask** to your local Ganache network and import a Ganache test account.
