const buildMimcSponge = require("circomlibjs").buildMimcSponge;

const fs = require("fs");
const path = require("path");

async function fileSystemResolver(from, to) {
    const location = path.resolve(path.dirname(path.resolve(from)), to);
    const source = await fs.promises.readFile(location, 'utf-8');
    return source;
}

async function init() {
    let { initialize } = await import("zokrates-js");
    const zokratesProvider = await initialize();
    return zokratesProvider;
}


async function main() {
    const board_source = await fileSystemResolver("index.js", "./zk/circuits/board/board.zok");

    mimcSponge = await buildMimcSponge();

    let board_hash_u8_arr = mimcSponge.multiHash([0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0]);
    let board_hash_object = mimcSponge.F.toObject(board_hash_u8_arr);

    const zokratesProvider = await init();
    const artifacts = zokratesProvider.compile(board_source);
    var input = [{ "x": "0", "y": "0", "z": "0" }, { "x": "0", "y": "1", "z": "0" }, { "x": "0", "y": "2", "z": "0" }, { "x": "0", "y": "3", "z": "0" }, { "x": "0", "y": "4", "z": "0" }]
    // computation
    const { witness, output } = zokratesProvider.computeWitness(artifacts, [board_hash_object.toString(10), input]);
    // run setup
    const keypair = zokratesProvider.setup(artifacts.program);

    // generate proof
    const proof = zokratesProvider.generateProof(
        artifacts.program,
        witness,
        keypair.pk
    );

    // export solidity verifier
    const verifier = zokratesProvider.exportSolidityVerifier(keypair.vk);

    // or verify off-chain
    const isVerified = zokratesProvider.verify(keypair.vk, proof);
    console.log(isVerified);
}

main();
