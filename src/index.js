const utils = require('./utils');
const config = require('../config.json');
const { staker } = require('./stake');
const { voter } = require('./vote');
const web3 = require('@solana/web3.js');
const { WalletManager, Wallet } = require('./walletManager');
const colors = require('colors');
const process = require('process');

const WM = new WalletManager();
const MainWallet = new Wallet(config.USER_DATA.main_pk);

async function main() {
    const connection = new web3.Connection(
        config.USER_DATA.rpc_url.length > 0 ? config.USER_DATA.rpc_url : web3.clusterApiUrl('mainnet-beta'),
        {
            'confirmTransactionInitialTimeout': 120000,
            'commitment': 'finalized'
        }
    );

    console.log(`zero cult?`);
    console.log(`\nhttps://t.me/concordclub`);
    console.log(`https://x.com/concordalpha`);
    console.log(`https://discord.gg/concordclub`);

    for (let i = 0; i < WM.wallets.length; i++) {
        const childWallet = WM.getWalletByIndex(i);
        console.log(`\n========${colors.rainbow(childWallet.getPublicKeyString())}========\n`)

        const isStaker = await childWallet.isStaker(connection);

        if (!isStaker) {
            const solBalance = await childWallet.getNativeBalance(connection);

            if ((solBalance / web3.LAMPORTS_PER_SOL) < config.USER_DATA.sol_to_transfer) {
                const solTransfer = await MainWallet.transfer(connection, config.USER_DATA.sol_to_transfer - (solBalance / web3.LAMPORTS_PER_SOL), childWallet.getPublicKey());

                if (typeof solTransfer === "object") {
                    utils.logger(solTransfer.reason);
                    break;
                } else utils.logger(`${colors.green(childWallet.getPublicKeyString())} | SOL transfer hash: ${colors.cyan(solTransfer)}`);
            }

            await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));

            const jupBalance = await childWallet.getTokenBalance(connection, config.JUP_DATA.token).then(r => r.uiAmount ? r.uiAmount : 0);

            if (jupBalance < config.USER_DATA.jup_to_vote) {
                const jupTransfer = await MainWallet.transferToken(connection, childWallet.getPublicKey(), config.JUP_DATA.token, config.USER_DATA.jup_to_vote - jupBalance);

                if (typeof jupTransfer === "object") {
                    utils.logger(jupTransfer.reason);
                    break;
                } else utils.logger(`${colors.green(childWallet.getPublicKeyString())} | JUP transfer hash: ${colors.cyan(jupTransfer)}`);
            }
            
            await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));
            await staker(connection, childWallet.keypair);
        } else utils.logger(`${colors.green(childWallet.getPublicKeyString().toString())} | Is already a staker.`);

        for (let proposal of config.JUP_VOTINGS.proposals) {
            const res = await voter(connection, proposal, childWallet.keypair);

            if (res)
                utils.logger(`${colors.green(childWallet.getPublicKeyString())} | Proposal voting hash: ${colors.cyan(res)}`);
        }

        await utils.sleep(config.delay.min, config.delay.max);
    }
}

process.removeAllListeners('warning');
main();