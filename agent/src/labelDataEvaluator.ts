import {
    IAgentRuntime,
    Memory,
    Evaluator,
    ModelClass,
    elizaLogger,
    generateObjectDeprecated,
} from "@elizaos/core";
import { uploadJson } from "./pinata";
import { mintLabel } from "./labels";

// Define strict types for label data
export interface LabelData {
    name: string | undefined;
    description: string | undefined;
    recipient: string | undefined;
    lastUpdated: number | undefined;
}

// Initialize empty label data
export const emptyLabelData: LabelData = {
    name: undefined,
    description: undefined,
    recipient: undefined,
    lastUpdated: undefined,
};

// Helper functions
const getCacheKey = (runtime: IAgentRuntime, labelId: string): string => {
    return `${runtime.character.name}/${labelId}/data`;
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

export const isDataComplete = (data: LabelData): boolean => {
    return getMissingFields(data).length === 0;
};

// Evaluator Implementation
export const labelDataEvaluator: Evaluator = {
    name: "GET_LABEL_DATA",
    similes: [
        "EXTRACT_LABEL_INFO",
        "GET_LABEL_INFORMATION",
        "COLLECT_LABEL_DATA",
        "LABEL_DETAILS",
    ],
    description:
        "Extract the label's name, description, and recipient (an Ethereum address) from the conversation when explicitly mentioned.",
    alwaysRun: true,

    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<LabelData>(
                cacheKey
            )) || { ...emptyLabelData };
            return !isDataComplete(cachedData);
        } catch (error) {
            elizaLogger.error("Error in labelDataEvaluator validate:", error);
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<LabelData>(
                cacheKey
            )) || { ...emptyLabelData };

            const extractionTemplate = `
                Analyze the following conversation to extract label information.
                Only extract information when it is explicitly and clearly stated by the label about themselves.

                Conversation:
                ${message.content.text}

                Return a JSON object containing only the fields where information was clearly found:
                {
                    "name": "extracted label's name if stated",
                    "description": "extracted label's description if stated",
                    "recipient": "extracted Ethereum address of the label's recipient if stated"
                }

                Only include fields where information is explicitly stated and current.
                Omit fields if information is unclear, hypothetical, or about others.
                `;

            const extractedInfo = await generateObjectDeprecated({
                runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
            });

            let dataUpdated = false;

            // Update only undefined fields with new information
            for (const field of ["name", "description", "recipient"] as const) {
                if (extractedInfo[field] && cachedData[field] === undefined) {
                    cachedData[field] = extractedInfo[field];
                    dataUpdated = true;
                }
            }

            if (dataUpdated) {
                cachedData.lastUpdated = Date.now();
                await runtime.cacheManager.set(cacheKey, cachedData, {
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week cache
                });
            }

            if (isDataComplete(cachedData)) {
                elizaLogger.success(
                    "Label data collection completed:",
                    cachedData
                );
                // DO SOME API CALL OUT TO SOMETHING ELSE HERE!!!!
                const ipfsHash = await uploadJson(cachedData.name, cachedData.description);
                await mintLabel( cachedData.recipient, `ipfs://${ipfsHash}`);
            }
        } catch (error) {
            elizaLogger.error("Error in labelDataEvaluator handler:", error);
        }
    },

    examples: [
        {
            context: "Initial label introduction",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: `Hi everyone! I want to create a new NFT label called Porsche 911 Carrera
                        with this description: An iconic sports car with a twin-turbo flat-six engine, sharp handling, and timeless design.
                        It offers thrilling performance and luxury, blending heritage with innovation.
                        I want the label to be sent to the address 0x032e21f8277033fd4ddbb2127f5ebe74c7cdb09e36e72bd0071ad9bf6039b7bd`,
                    },
                },
            ],
            outcome: `[{
                "name": "Porsche 911 Carrera",
                "description": "An iconic sports car with a twin-turbo flat-six engine, sharp handling, and timeless design.
                        It offers thrilling performance and luxury, blending heritage with innovation.",
                "recipient": "0x032e21f8277033fd4ddbb2127f5ebe74c7cdb09e36e72bd0071ad9bf6039b7bd"
            }]`,
        },
        {
            context: "Purchase discussion",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I plan to buy a new Porsche 911 Carrera next year.",
                    },
                },
            ],
            outcome: "{}",
        },
        {
            context: "NFT portfolio discussion",
            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "I already own many  NFTs in my wallet 0x032e21f8277033fd4ddbb2127f5ebe74c7cdb09e36e72bd0071ad9bf6039b7bd" },
                },
            ],
            outcome: "{}",
        },
    ],
};
