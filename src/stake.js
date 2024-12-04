const web3 = require("@solana/web3.js");
const spl = require('@solana/spl-token');
const instructionFormer = require('./instructionFormer');
const colors = require('colors');
const utils = require('./utils');
const config = require('../config.json');
const base58 = require("bs58");

async function stake(connection, wallet, escrow, ata) {
    const instructions = [];
    const STA = await utils.queryAssociatedTokenAddress(
        connection,
        wallet.publicKey,
        config.JUP_DATA.token
    );

    instructions.push(instructionFormer.ToggleMaxLock(escrow, wallet));
    instructions.push(instructionFormer.IncreaseLockedAmount(
        escrow, ata, wallet, STA.pubkey, STA.account.data.parsed.info.tokenAmount.amount
    ));
    instructions.push(instructionFormer.ComputeUnitLimit());
    instructions.push(instructionFormer.ComputeUnitPrice());

    const tx = new web3.Transaction();
    for (let i of instructions)
        tx.add(i);

    const hash = await utils.sendTX(connection, tx, wallet);
    return hash;
}

async function createEscrow(connection, wallet) {
    const [escrow, bump] = utils.generateEscrow([
        Buffer.from("Escrow"),
        utils.addressToBuffer(config.JUP_DATA.locker.address),
        wallet.publicKey.toBuffer()
    ], config.JUP_DATA.locker.program_id);

    const ata = spl.getAssociatedTokenAddressSync(
        new web3.PublicKey(config.JUP_DATA.token),
        escrow,
        true
    );

    const info = await connection.getAccountInfo(escrow, 'finalized');
    if(info) {
        utils.logger(`${colors.green(wallet.publicKey.toString())} | Escrow was already initialized.`);

        return {
            hash: null,
            escrow,
            ata
        }
    }

    const instructions = [];

    instructions.push(instructionFormer.ComputeUnitPrice());
    instructions.push(instructionFormer.NewEscrowInstruction(
        escrow,
        wallet
    ));
    instructions.push(instructionFormer.createATAInstruction(
        escrow,
        config.JUP_DATA.token,
        wallet
    ));
    instructions.push(instructionFormer.ComputeUnitLimit());

    const tx = new web3.Transaction();
    for (let i of instructions)
        tx.add(i);

    const hash = await utils.sendTX(connection, tx, wallet);
    return {
        hash,
        escrow,
        ata
    }
}

async function staker(connection, wallet) {
    let escrow = "";
    while(!(typeof escrow === "object")) {
        escrow = await createEscrow(connection, wallet).catch(err => {
            utils.logger(`${colors.green(wallet.publicKey.toString())} | Creating escrow failed, trying again.`);
            return "";
        });

        await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));
    }

    if(escrow.hash)
        utils.logger(`${colors.green(wallet.publicKey.toString())} | Escrow was successfully initalized. Hash: ${colors.cyan(escrow.hash)}`);

    await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));

    let _stake = {};
    while(!(typeof _stake === "string")) {
        _stake = await stake(connection, wallet, escrow.escrow, escrow.ata).catch(err => {
            console.log(err);
            utils.logger(`${colors.green(wallet.publicKey.toString())} | Creating stake failed, trying again.`);
            return "";
        });

        await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));
    }

    _stake.length > 0 
    ? utils.logger(`${colors.green(wallet.publicKey.toString())} | Staking hash: ${_stake}`) 
    : null;
}

module.exports = { staker }