const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');
const utils = require('./utils');
const instructionFormer = require('./instructionFormer');
const config = require('../config.json');

class Wallet {
    keypair;

    constructor(secretKey) {
        this.keypair = web3.Keypair.fromSecretKey(bs58.decode(secretKey));
    }

    getPublicKey() {
        return this.keypair.publicKey;
    }

    getPublicKeyString() {
        return this.keypair.publicKey.toString();
    }

    getSecretKey() {
        return this.keypair.secretKey;
    }

    async getNativeBalance(connection) {
        return await connection.getBalance(this.keypair.publicKey, 'finalized');
    }

    async getTokenBalance(connection, mint) {
        let _b = await utils.queryAssociatedTokenAddress(
            connection,
            this.keypair.publicKey,
            mint
        );

        if(!_b)
            return 0;
        else return _b.account.data.parsed.info.tokenAmount;
    }

    async transfer(connection, amount, to) {
        const _balance = await this.getNativeBalance(connection);
        if((_balance / web3.LAMPORTS_PER_SOL) > amount)
            return await instructionFormer.transferSol(connection, this.keypair, to, amount);
        else return {
            reason: `\nNot enough native.\nExpected: ${amount}\nReceived: ${_balance / web3.LAMPORTS_PER_SOL}`
        };
    }

    async transferToken(connection, to, token, amount) {
        const _balance = await this.getTokenBalance(connection, token);

        if(_balance.uiAmount >= amount)
            return await instructionFormer.createAndTransfer(connection, this.keypair, to, token, amount);
        else return {
            reason: `Not enough tokens.\nExpected: ${amount}\nReceived: ${_balance}`
        };
    }

    async isStaker(connection) {
        const [escrow, bump] = utils.generateEscrow([
            Buffer.from("Escrow"),
            utils.addressToBuffer(config.JUP_DATA.locker.address),
            this.keypair.publicKey.toBuffer()
        ], config.JUP_DATA.locker.program_id);

        const Escrow_STA = await utils.queryAssociatedTokenAddress(
            connection,
            escrow,
            config.JUP_DATA.token
        );

        if (!Escrow_STA) return false;

        const _staAmount = Escrow_STA.account.data.parsed.info.tokenAmount.uiAmount;
        return _staAmount > 0;
    }
}

class WalletManager {
    wallets;

    constructor() {
        const _ = fs.readFileSync("data/wallets.txt", { encoding: 'utf-8' });
        this.wallets = _
            .replace(/\r/gm, "")
            .split("\n")
            .map(kp => new Wallet(kp.split(":")[1]));
    }

    createWallet() {
        const keypair = new web3.Keypair();
        this.wallets.push(new Wallet(bs58.encode(keypair.secretKey)));

        let _;
        for(let wallet of this.wallets) {
            _ += `${wallet.getPublicKey().toString()}:${bs58.encode(wallet.getSecretKey())}\n`;
        }

        fs.writeFileSync("data/wallets.txt", _, { flag: 'w', encoding: 'utf-8' });
    }

    getWalletByIndex(index) {
        return this.wallets[index];
    }

    getWalletByKey(value) {
        return this.wallets.find(k => k.getPublicKey().toString() === value);
    }
}

module.exports = { WalletManager, Wallet }