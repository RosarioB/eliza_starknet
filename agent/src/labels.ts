import { Account, RpcProvider, Contract } from "starknet";
import labelsAbi from "./labels.json" with { type: "json" };

const DEPLOYED_CONTRACT =
    "0x062217de4d51800c4c627d98bf820d9b6d16a1c4d8cd5f0f91645bf8f22bab5e";

enum StarknetChainId {
    MAIN = "0x534e5f4d41494e",
    SEPOLIA = "0x534e5f5345504f4c4941",
}

enum StarknetBlockExplorerUrl {
    MAIN = "https://starkscan.co/tx/",
    SEPOLIA = "https://sepolia.starkscan.co/tx/",
}

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
    const { transaction_hash: txHash } = await account.execute(
        mintCall /* , {
        version: 3,
    } */
    );
    await provider.waitForTransaction(txHash);
    return txHash;
};

export const getBlockExplorerUrl = async () => {
    const chain = await provider.getChainId();
    if (chain.toString() === StarknetChainId.SEPOLIA.toString()) {
        return StarknetBlockExplorerUrl.SEPOLIA.toString();
    }
    return StarknetBlockExplorerUrl.MAIN.toString();
};
