import { useEffect, useState, useCallback } from "react";
import { getCosmosClient, clearCosmosClient } from "../../utils/cosmos/client";
import { useNetwork } from "../../context/NetworkContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { CardDistribution } from "./types";
import { AnimatedBackground } from "../../components/common/AnimatedBackground";
import { ExplorerHeader } from "../../components/explorer/ExplorerHeader";
import styles from "./DistributionPage.module.css";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DistributionPage() {
    const [distribution, setDistribution] = useState<CardDistribution>({});
    const [loading, setLoading] = useState(true);
    const [totalGames, setTotalGames] = useState(0);
    const [totalCardsDealt, setTotalCardsDealt] = useState(0);
    const { currentNetwork } = useNetwork();

    const fetchCardDistribution = useCallback(async () => {
        try {
            setLoading(true);

            // Initialize Cosmos client
            const cosmosClient = getCosmosClient({
                rpc: currentNetwork.rpc,
                rest: currentNetwork.rest
            });

            if (!cosmosClient) {
                throw new Error("Block52 client not initialized.");
            }

            // Fetch all games
            const games = await cosmosClient.listGames();

            // Initialize distribution map with all 52 cards at 0
            const cardCounts: CardDistribution = initializeCardCounts();

            let totalCardsProcessed = 0;

            // Process each game
            for (const game of games) {
                const gameId = game.gameId;
                if (!gameId) continue;
                try {
                    // Fetch game info (contains gameState with communityCards)
                    const gameResponse = await cosmosClient.getGame(gameId);

                    // Parse the game JSON string
                    if (!gameResponse || !gameResponse.game) {
                        continue;
                    }

                    const gameData = JSON.parse(gameResponse.game);
                    const gameState = gameData?.gameState;

                    if (gameState) {
                        // Count community cards (these are publicly visible dealt cards)
                        const communityCards = gameState.communityCards || [];

                        communityCards.forEach((card: string) => {
                            // Skip masked cards (X) and validate card format
                            if (card && card !== "X" && card.length === 2 && cardCounts[card] !== undefined) {
                                cardCounts[card]++;
                                totalCardsProcessed++;
                            }
                        });

                        // Also count visible hole cards from previous actions (showdown)
                        // Players' holeCards are masked as "X" unless at showdown
                        const players = gameState.players || [];
                        players.forEach((player: any) => {
                            const holeCards = player.holeCards || [];
                            holeCards.forEach((card: string) => {
                                if (card && card !== "X" && card.length === 2 && cardCounts[card] !== undefined) {
                                    cardCounts[card]++;
                                    totalCardsProcessed++;
                                }
                            });
                        });
                    }
                } catch {
                    // Failed to fetch game - continue with others
                }
            }

            setDistribution(cardCounts);
            setTotalGames(games.length);
            setTotalCardsDealt(totalCardsProcessed);
            setLoading(false);
        } catch (error) {
            console.error("❌ Error fetching card distribution:", error);
            setLoading(false);
        }
    }, [currentNetwork]);

    useEffect(() => {
        // Clear client when network changes to force re-initialization
        clearCosmosClient();
        fetchCardDistribution();
    }, [currentNetwork, fetchCardDistribution]);

    // Initialize all 52 cards with count of 0
    function initializeCardCounts(): CardDistribution {
        const counts: CardDistribution = {};
        const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
        const suits = ["S", "H", "D", "C"];

        for (const rank of ranks) {
            for (const suit of suits) {
                counts[`${rank}${suit}`] = 0;
            }
        }

        return counts;
    }

    // Prepare data for Chart.js
    const chartData = {
        labels: Object.keys(distribution).sort(), // X-axis: Card mnemonics
        datasets: [
            {
                label: "Card Frequency",
                data: Object.keys(distribution)
                    .sort()
                    .map(card => distribution[card]), // Y-axis: Counts
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top" as const
            },
            title: {
                display: true,
                text: "Card Distribution Across All Games (Proves Randomness)",
                color: "#ffffff"
            },
            tooltip: {
                callbacks: {
                    afterLabel: (context: any) => {
                        const total = totalCardsDealt;
                        if (total === 0) return "";
                        const percentage = ((context.parsed.y / total) * 100).toFixed(2);
                        return `${percentage}% of total dealt cards`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Card Mnemonic",
                    color: "#ffffff"
                },
                ticks: {
                    color: "#ffffff"
                }
            },
            y: {
                title: {
                    display: true,
                    text: "Frequency (Times Dealt)",
                    color: "#ffffff"
                },
                beginAtZero: true,
                ticks: {
                    color: "#ffffff"
                }
            }
        }
    };

    return (
        <div className="min-h-screen p-8 relative">
            <AnimatedBackground />
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Explorer Navigation Header */}
                <ExplorerHeader title="Block Explorer" />

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-lg text-white">Loading distribution data...</p>
                    <p className="text-sm text-gray-400 mt-2">This may take a moment as we analyze all games...</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
                            <h3 className="text-sm font-medium text-gray-400">Total Games Analyzed</h3>
                            <p className="text-3xl font-bold mt-2 text-white">{totalGames}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
                            <h3 className="text-sm font-medium text-gray-400">Total Cards Dealt</h3>
                            <p className="text-3xl font-bold mt-2 text-white">{totalCardsDealt}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
                            <h3 className="text-sm font-medium text-gray-400">Expected Per Card</h3>
                            <p className="text-3xl font-bold mt-2 text-white">{totalCardsDealt > 0 ? (totalCardsDealt / 52).toFixed(1) : "0"}</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
                        <div className={styles.chartContainer}>
                            <Bar data={chartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="mt-8 bg-blue-900/20 rounded-lg p-6 border border-blue-800">
                        <h2 className="text-xl font-bold mb-3 text-white">📖 How to Read This Chart</h2>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li>
                                ✅ <strong className="text-white">Randomness Check</strong>: If the distribution is fair, each card should appear roughly the
                                same number of times (within statistical variance).
                            </li>
                            <li>
                                ✅ <strong className="text-white">Expected Frequency</strong>: {totalCardsDealt > 0 ? (totalCardsDealt / 52).toFixed(1) : "N/A"}{" "}
                                times per card (total dealt / 52 cards).
                            </li>
                            <li>
                                ✅ <strong className="text-white">Cosmos Blockchain Shuffling</strong>: Decks are shuffled using deterministic block hash,
                                ensuring verifiable randomness across all validators.
                            </li>
                            <li>
                                ✅ <strong className="text-white">Transparency</strong>: All deck shuffles are on-chain and auditable. No single party can
                                manipulate card distribution.
                            </li>
                        </ul>
                    </div>
                </>
            )}
            </div>
        </div>
    );
}
