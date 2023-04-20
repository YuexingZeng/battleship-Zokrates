const buildMimcSponge = require("circomlibjs").buildMimcSponge;

async function main() {
    let { initialize } = await import("zokrates-js");
    mimcSponge = await buildMimcSponge();
    
    let board_hash_u8_arr = mimcSponge.multiHash([0,0,0,0,1,0,0,2,0,0,3,0,0,4,0]);
    let board_hash_object = mimcSponge.F.toObject(board_hash_u8_arr);

    initialize().then((zokratesProvider) => {
        const source = `import "utils/casts/u32_to_field.zok" as u32_to_field;
        import "hashes/mimcSponge/mimcSponge.zok" as mimcSponge;
        
        struct Coordinate {
            u32 x;
            u32 y;
            u32 z;
        }
        
        def check_ship_ranges(u32 length, Coordinate coordinate) -> (u32,u32) {
             assert(coordinate.z < 2);
             return if coordinate.z == 1 {
                (coordinate.y,coordinate.x)
             } else {
                (coordinate.x,coordinate.y)
             } ;
        }
        
        def has_ship<N>(u32 coord,u32[N] ship_coords) -> u32 {
            u32 mut collisions = 0;
            for u32 mut i in 0..N {
                collisions = collisions + (ship_coords[i] == coord ? 1u32 : 0u32);
            }
            return collisions;
        }
        
        def check_for_collision(u32[5] lengths,Coordinate[5] ships) -> bool{
            u32 mut collisions = 0;
            u32 mut length_sum = 0;
            for u32 mut i in 0..5 {
                length_sum = length_sum + lengths[i];
            }
            u32[length_sum] mut ship_coords = [100;length_sum];
            u32 mut index = 0;
            for u32 mut i in 0..5 {
                for u32 mut j in 0..lengths[i] {
                    u32 mut coord = 0 ;
                    coord = if ships[i].z == 1 {
                        ships[i].x + ships[i].y*10 + j*10
                    } else {
                        ships[i].x + ships[i].y*10 + j
                    };
                    collisions = collisions + has_ship(coord, ship_coords);
                    ship_coords[index]=coord;
                    index = index+1;
                }
            }
            assert(collisions == 0);
            return true;
        }
        
        def main(
            public field hash,
            Coordinate[5] ships){
            u32[5] lengths = [5,4,3,3,2];
            for u32 i in 0..5 {
                (u32,u32) v = check_ship_ranges(lengths[i],ships[i]);
                assert(v.0 + lengths[i] < 11);
                assert(v.1 < 10);
            }
               bool tmp = check_for_collision(lengths,ships);
               assert(tmp==true);
            field[15] mut preImage = [0;15];
            for u32 i in 0..5 {
                preImage[i*3]=u32_to_field(ships[i].x);
                preImage[i*3+1]=u32_to_field(ships[i].y);
                preImage[i*3+2]=u32_to_field(ships[i].z);
            }
            field[1] out = mimcSponge::<_,1>(preImage,0);
            assert(hash==out[0]);
        }`;

        // compilation
        const artifacts = zokratesProvider.compile(source);

        var input = [{ "x": "0", "y": "0", "z": "0" }, { "x": "0", "y": "1", "z": "0" }, { "x": "0", "y": "2", "z": "0" }, { "x": "0", "y": "3", "z": "0" }, { "x": "0", "y": "4", "z": "0" }]
        // computation
        const { witness, output } = zokratesProvider.computeWitness(artifacts, [board_hash_object.toString(10),input]);
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
    });
}

main();
