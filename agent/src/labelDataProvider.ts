import {
    IAgentRuntime,
    Memory,
    Provider,
    State,
    elizaLogger,
} from "@elizaos/core";

import {
    isDataComplete,
    LabelData,
    emptyLabelData,
    MintTxData,
    emptyMintTx,
} from "./labelDataEvaluator.ts";
import { getBlockExplorerUrl } from "./labels.ts";

const FIELD_GUIDANCE = {
    name: {
        description: "Label's name",
        valid: "Porsche 911, iPhone 12, Nike Air Max 90",
        invalid: "future plans, past possessions, or aspirational items",
        instructions: "Extract only when user directly states the label's name",
    },
    description: {
        description: "Label's description",
        valid: "A gret car, a smartphone, a pair of shoes",
        invalid: "future plans, past possessions, or aspirational items",
        instructions:
            "Extract only when user directly states the label's description",
    },
    recipient: {
        description: "Recipient's Starknet address for the label",
        valid: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e, 0x53d284357ec70cE289D6D64134DfAc8E511c8a3D, 0x66f820a414680B5bcda5eECA5dea238543F42054",
        invalid:
            "email addresses, phone numbers, home addresses, or other types of addresses",
        instructions:
            "Extract only when user directly states the label's recipient",
    },
};

const getCacheKey = (runtime: IAgentRuntime, userId: string): string => {
    return `${runtime.character.name}/${userId}/data`;
};

const getMissingFields = (
    data: LabelData
): Array<keyof Omit<LabelData, "lastUpdated">> => {
    const fields: Array<keyof Omit<LabelData, "lastUpdated">> = [
        "name",
        "description",
        "recipient",
    ];
    return fields.filter((field) => !data[field]);
};

export const labelDataProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<LabelData>(
                cacheKey
            )) || { ...emptyLabelData };

            let response = "Label Information Status:\n\n";

            const knownFields = Object.entries(cachedData)
                .filter(
                    ([key, value]) =>
                        key !== "lastUpdated" && value !== undefined
                )
                .map(
                    ([key, value]) =>
                        `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
                );

            if (knownFields.length > 0) {
                response += "Current Information:\n";
                response += knownFields.map((field) => `- ${field}`).join("\n");
                response += "\n\n";
            }

            const missingFields = getMissingFields(cachedData);

            if (missingFields.length > 0) {
                response +=
                    "CURRENT TASK FOR " + runtime.character.name + ":\n";
                response +=
                    runtime.character.name +
                    " should try to prioritize getting this information from the user by asking them questions\n" +
                    "Missing Information and Extraction Guidelines:\n\n";

                missingFields.forEach((field) => {
                    const guidance = FIELD_GUIDANCE[field];
                    response += `${field.charAt(0).toUpperCase() + field.slice(1)}:\n`;
                    response += `- Description: ${guidance.description}\n`;
                    response += `- Valid Examples: ${guidance.valid}\n`;
                    response += `- Do Not Extract: ${guidance.invalid}\n`;
                    response += `- Instructions: ${guidance.instructions}\n\n`;
                });

                response += "Overall Guidance:\n";
                response +=
                    //"- Try to extract all missing information through natural conversation\n";
                    "- Try to extract all missing information through natural conversation, but be very direct and aggressive in getting that info\n";
                response +=
                    "- Only extract information when clearly and directly stated by the user\n";
                response +=
                    "- Verify information is current, not past or future\n";
            } else {
                response +=
                    "Status: All necessary information has been collected.\n";
                response +=
                    "Continue natural conversation without information gathering.";
            }

            return response;
        } catch (error) {
            elizaLogger.error("Error in labelDataProvider:", error);
            return "Error accessing label information. Continuing conversation normally.";
        }
    },
};

export const txLabelMintedProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const mintTxCachedData =
                (await runtime.cacheManager.get<MintTxData>(cacheKey)) || {
                    ...emptyMintTx,
                };
            let response = "";

            if (
                mintTxCachedData.txHash &&
                mintTxCachedData.txHash.trim() !== ""
            ) {
                const blockExplorerUrl = await getBlockExplorerUrl();
                elizaLogger.log("Block explorer URL:", blockExplorerUrl);
                const txUrl = `${blockExplorerUrl}${mintTxCachedData.txHash}`;
                response += `The label has been created successfully!\n`;
                response += `The transaction hash is ${txUrl}\n`;
                response += `The transaction URL on the Starknet block explorer is: ${txUrl}`;
            }

            return response;
        } catch (error) {
            elizaLogger.error("Error in labelDataCompletionProvider:", error);
            return "";
        }
    },
};
