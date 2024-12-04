const spl = require('@solana/spl-token');
const web3 = require('@solana/web3.js');
const colors = require('colors');

function addressToBuffer(addr) {
    return new web3.PublicKey(addr).toBuffer();
}

async function queryAssociatedTokenAddress(connection, pk, mint) {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pk, { programId: spl.TOKEN_PROGRAM_ID });
    return tokenAccounts.value.find(r => r.account.data.parsed.info.mint === mint)
}

function generateWallet() {
    return new web3.Keypair();
}

function generateEscrow(seed, program_id) {
    const [pk, bump] = web3.PublicKey.findProgramAddressSync(
        seed,
        new web3.PublicKey(program_id)
    );

    return [pk, bump]
}

function decimalToBigInt(amount, decimals) {
    const scaleFactor = BigInt(10 ** decimals);
    return BigInt(Math.floor(amount * (10 ** decimals))) * scaleFactor / BigInt(10 ** decimals);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function randomDecimal(min, max, decimals) {
    min *= 10 * decimals;
    max *= 10 * decimals;

    return (Math.floor(Math.random() * (max - min + 1) + min)) / (10 * decimals);
}

async function sleep(ms) {
    return new Promise(res => setTimeout(res,ms));
}

async function sendTX(connection, tx, payer) {
    tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    tx.feePayer = payer.publicKey;

    tx.compileMessage();
    tx.sign(payer);

    const txHash = await connection.sendTransaction(tx, [payer], { preflightCommitment: 'finalized', skipPreflight: true, maxRetries: 10 });
    await connection.confirmTransaction(txHash, 'finalized');

    return txHash;
}

const logger = (text) => 
    console.log(`${colors.magenta(new Date().toISOString())} | ${text}`);

const checkBalance = async (connection, required, wallet) => {
    const balance = await connection.getBalance(wallet) / web3.LAMPORTS_PER_SOL;
    return balance >= required;
}

module.exports = { addressToBuffer, queryAssociatedTokenAddress, generateWallet, generateEscrow, decimalToBigInt, randomInt, randomDecimal, sleep, sendTX, logger, checkBalance }