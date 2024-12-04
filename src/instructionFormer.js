const config = require('../config.json');
const web3 = require('@solana/web3.js');
const spl = require('@solana/spl-token');
const BufferLayout = require('@solana/buffer-layout');
const bs58 = require('bs58');
const utils = require('./utils');

const NewEscrowInstruction = (escrow, payer) => {
    return new web3.TransactionInstruction({
        keys: [
            { pubkey: new web3.PublicKey(config.JUP_DATA.locker.address), isWritable: true },
            { pubkey: escrow, isWritable: true },
            { pubkey: payer.publicKey, isWritable: true },
            { pubkey: payer.publicKey, isWritable: true, isSigner: true },
            { pubkey: web3.SystemProgram.programId }
        ],
        programId: new web3.PublicKey(config.JUP_DATA.locker.program_id),
        data: bs58.decode("dFPYhGeCkfi")
    });
}

const createATAInstruction = (escrow, tokenMintAddress, payer) => {
    tokenMintAddress = new web3.PublicKey(tokenMintAddress);

    const associatedTokenAddress = spl.getAssociatedTokenAddressSync(
        tokenMintAddress,
        escrow,
        true
    );

    return spl.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        escrow,
        tokenMintAddress
    )
}

const IncreaseLockedAmount = (escrow, associatedTokenAddress, payer, pda, amount) => {
    let dataBuffer = Buffer.from(bs58.decode("hXMy9aWmoGaRdPDcuHvXZ"));
    dataBuffer.readBigUInt64LE(8);
    dataBuffer.writeBigUInt64LE(BigInt(amount), 8);

    return new web3.TransactionInstruction({
        keys: [
            { pubkey: new web3.PublicKey(config.JUP_DATA.locker.address), isWritable: true },
            { pubkey: escrow, isWritable: true },
            { pubkey: associatedTokenAddress, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: pda, isWritable: true, isSigner: false },
            { pubkey: spl.TOKEN_PROGRAM_ID }
        ],
        programId: new web3.PublicKey(config.JUP_DATA.locker.program_id),
        data: dataBuffer
    });
}

const NewVote = (vote, proposal, payer) => {
    const VoterSchema = BufferLayout.struct([
        BufferLayout.blob(32, 'voter')
    ]);

    const b = Buffer.alloc(VoterSchema.span);
    VoterSchema.encode({
        'voter': bs58.decode(payer.publicKey.toString())
    }, b);

    const hex1 = `a36c9dbd8c500d8f${b.toString("hex")}`;
    const _bu = Buffer.from(hex1, "hex");

    return new web3.TransactionInstruction({
        keys: [
            { pubkey: new web3.PublicKey(proposal), isWritable: true },
            { pubkey: vote, isWritable: true },
            { pubkey: payer.publicKey, isWritable: true, isSigner: true },
            { pubkey: web3.SystemProgram.programId }
        ],
        programId: new web3.PublicKey(config.JUP_VOTINGS.program_id),
        data: bs58.decode(bs58.encode(_bu))
    })
}

const CastVote = (vote, data, proposal, payer) => {
    const [escrow, bump] = utils.generateEscrow([
        Buffer.from("Escrow", "utf-8"),
        utils.addressToBuffer(config.JUP_DATA.locker.address),
        payer.publicKey.toBuffer()
    ], config.JUP_DATA.locker.program_id);

    return new web3.TransactionInstruction({
        keys: [
            { pubkey: new web3.PublicKey(config.JUP_DATA.locker.address) },
            { pubkey: escrow },
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: new web3.PublicKey(proposal), isWritable: true },
            { pubkey: vote, isWritable: true },
            { pubkey: new web3.PublicKey(config.JUP_VOTINGS.governor) },
            { pubkey: new web3.PublicKey(config.JUP_VOTINGS.program_id) }
        ],
        programId: new web3.PublicKey(config.JUP_DATA.locker.program_id),
        data: bs58.decode(data)
    })
}

const ToggleMaxLock = (escrow, payer) => {
    return new web3.TransactionInstruction({
        keys: [
            { pubkey: new web3.PublicKey(config.JUP_DATA.locker.address), isWritable: true },
            { pubkey: escrow, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: true }
        ],
        programId: new web3.PublicKey(config.JUP_DATA.locker.program_id),
        data: bs58.decode("35nv67PJjDCye")
    });
}

const ComputeUnitLimit = () => {
    return web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: Number(config.GAS_PRESETS.units)
    });
}

const ComputeUnitPrice = () => {
    return web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Number(config.GAS_PRESETS.lamports)
    });
}

const createAndTransfer = async (connection, from, to, token, amount) => {
    token = new web3.PublicKey(token);
    to = new web3.PublicKey(to);

    const fromTokenAccount = await spl.getOrCreateAssociatedTokenAccount(
        connection,
        from,
        token,
        from.publicKey
    );

    const assocToken = spl.getAssociatedTokenAddressSync(
        token,
        to,
        true
    );

    let toTokenAccount;

    try {
        toTokenAccount = await spl.getAccount(
            connection,
            assocToken,
            'finalized'
        );
    } catch (error) {
        if (error instanceof spl.TokenAccountNotFoundError || error instanceof spl.TokenInvalidAccountOwnerError) {
            const _tx = new web3.Transaction().add(
                spl.createAssociatedTokenAccountInstruction(
                    from.publicKey,
                    assocToken,
                    to,
                    token,
                    spl.TOKEN_PROGRAM_ID,
                    spl.ASSOCIATED_TOKEN_PROGRAM_ID
                )
            ).add(web3.ComputeBudgetProgram.setComputeUnitLimit({
                units: Number(config.GAS_PRESETS.units)
            })).add(web3.ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: Number(config.GAS_PRESETS.lamports)
            }));

            _tx.feePayer = from.publicKey;
            _tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;

            _tx.compileMessage();
            _tx.sign(from);

            const hash = await connection.sendTransaction(_tx, [from], { skipPreflight: true, preflightCommitment: 'finalized', maxRetries: 5 });
            await connection.confirmTransaction(hash, 'finalized');

            toTokenAccount = await spl.getAccount(
                connection,
                assocToken,
                'finalized'
            );
        }
    }
    
    const tx = new web3.Transaction().add(
        spl.createTransferInstruction(
            fromTokenAccount.address,
            toTokenAccount.address,
            from.publicKey,
            utils.decimalToBigInt(amount, 6),
            [],
            spl.TOKEN_PROGRAM_ID
        )
    ).add(web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: Number(config.GAS_PRESETS.units)
    })).add(web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Number(config.GAS_PRESETS.lamports)
    }));

    tx.feePayer = from.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;

    tx.compileMessage();
    tx.sign(from);

    const txHash = await connection.sendTransaction(tx, [from], { preflightCommitment: 'finalized', skipPreflight: true, maxRetries: 10 });
    await connection.confirmTransaction(txHash, 'finalized');

    return txHash;
}

const transferSol = async (connection, from, to, amount) => {
    const tx = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: to,
            lamports: web3.LAMPORTS_PER_SOL * amount
        })
    ).add(web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: Number(config.GAS_PRESETS.units)
    })).add(web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Number(config.GAS_PRESETS.lamports)
    }));

    tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    tx.feePayer = from.publicKey;

    tx.compileMessage();
    tx.sign(from);

    const txHash = await connection.sendTransaction(tx, [from], { preflightCommitment: 'finalized', skipPreflight: true, maxRetries: 10 });
    await connection.confirmTransaction(txHash, 'finalized');

    return txHash;
}

module.exports = { NewEscrowInstruction, createATAInstruction, IncreaseLockedAmount, ToggleMaxLock, ComputeUnitLimit, ComputeUnitPrice, createAndTransfer, transferSol, NewVote, CastVote }