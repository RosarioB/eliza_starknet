import { PinataSDK } from "pinata-web3";
import { elizaLogger } from "@elizaos/core";

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY_URL!,
});

export const uploadJson = async (name: string, description: string) => {
    const { IpfsHash } = await pinata.upload.json({
        name,
        description,
    });
    elizaLogger.success(`Uploaded JSON to IPFS with hash: ${IpfsHash}`);
    return IpfsHash;
};
