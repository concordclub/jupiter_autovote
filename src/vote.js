const web3 = require('@solana/web3.js');
const colors = require('colors');
const utils = require('./utils');
const instructionFormer = require('./instructionFormer');
const config = require('../config.json');
const base58 = require('bs58');

function _constructVoteTransaction(vote, proposal, wallet) {
    const tx = new web3.Transaction();
    const instructions = [];

    instructions.push(instructionFormer.ComputeUnitPrice());
    instructions.push(instructionFormer.NewVote(vote, proposal, wallet));
    instructions.push(instructionFormer.CastVote(vote, _formRandomVote(1, config.JUP_VOTINGS.vote_threshold), proposal, wallet));
    instructions.push(instructionFormer.ComputeUnitLimit());

    for (let i of instructions)
        tx.add(i);

    return tx;
}

async function _confirmVoteNeeded(connection, vote) {
    const balance = await connection.getBalance(vote, 'finalized');
    return balance == 0;
}

function _formRandomVote(lim1, lim2) {
    const _preset = "GNrgBfnFwJtZ";
    const _buffer = Buffer.from(base58.decode(_preset));

    _buffer.writeUInt8(utils.randomInt(lim1, lim2), 8);
    return base58.encode(_buffer);
}

async function voter(connection, proposal, wallet) {
    utils.logger(`${colors.green(wallet.publicKey.toString())} | Proposal: ${colors.cyan(proposal)}`);
    proposal = new web3.PublicKey(proposal);

    const [vote, bump] = utils.generateEscrow([
        Buffer.from("Vote"),
        proposal.toBuffer(),
        wallet.publicKey.toBuffer()
    ], config.JUP_VOTINGS.program_id);

    const _voteNeeded = await _confirmVoteNeeded(connection, vote);
    if(!_voteNeeded) {
        utils.logger(`${colors.green(wallet.publicKey.toString())} | Voted on this proposal already.`);
        return;
    } else await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));

    const reqBalance = await utils.checkBalance(connection, 0.0025, wallet.publicKey);
    if(!reqBalance) {
        utils.logger(`${colors.green(wallet.publicKey.toString())} | Does not have enough balance to vote.`);
        return;
    } else await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));

    const tx = _constructVoteTransaction(vote, proposal, wallet);
    let voteResult = {};
    while(!(typeof voteResult === "string")) {
        voteResult = await utils.sendTX(connection, tx, wallet).catch(err => {
            utils.logger(`${colors.green(wallet.publicKey.toString())} | Voting failed, trying again.`);
            return {};
        });

        await utils.sleep(utils.randomInt(config.delay.min, config.delay.max));
    }

    return voteResult;
}

module.exports = { voter }