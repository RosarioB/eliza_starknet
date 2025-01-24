import { Account, RpcProvider, Contract } from "starknet";
import labelsAbi from "./labels.json" with { type: "json" };
import { elizaLogger } from "@elizaos/core";

const DEPLOYED_CONTRACT =
    "0x062217de4d51800c4c627d98bf820d9b6d16a1c4d8cd5f0f91645bf8f22bab5e";

const provider = new RpcProvider({
    nodeUrl: process.env.STARKNET_RPC_URL,
});

const account = new Account(
    provider,
    process.env.STARKNET_ADDRESS,
    process.env.STARKNET_PRIVATE_KEY
);

const labelsContract = new Contract(labelsAbi, DEPLOYED_CONTRACT, provider);
labelsContract.connect(account);

export const mintLabel = async (recipient: string, uri: string) => {
    const mintCall = labelsContract.populate("mint_item", { recipient, uri });
    const { transaction_hash: transferTxHash } = await account.execute(
        mintCall,
        {
            version: 3,
        }
    );
    await provider.waitForTransaction(transferTxHash);
    elizaLogger.success(
        `Minted label with transaction hash: ${transferTxHash}`
    );
    return transferTxHash;
};
