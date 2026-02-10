import React from "react";
import { useGameStateContext } from "../../context/GameStateContext";
import { PlayerDTO } from "@block52/poker-vm-sdk";
import { VacantSeatResponse } from "../../types/index";
import { isValidPlayerAddress } from "../../utils/addressUtils";

/**
 * Custom hook to manage data for vacant seats
 * @param tableId The ID of the table (not used - Context manages subscription)
 * @returns Object containing seat vacancy data
 */
export const useVacantSeatData = (): VacantSeatResponse => {
    // Get game state directly from Context - no additional WebSocket connections
    const { gameState, isLoading, error } = useGameStateContext();
    
    const userAddress = React.useMemo(() => {
        // Use Cosmos address (b52...) instead of Ethereum address
        return localStorage.getItem("user_cosmos_address")?.toLowerCase() || null;
    }, []);

    // Memoize players array and maxPlayers to avoid repeated property access
    const { players, maxPlayers } = React.useMemo(() => ({
        players: gameState?.players || [],
        maxPlayers: gameState?.gameOptions?.maxPlayers
    }), [gameState]);

    // Check if user is already playing at the table
    const isUserAlreadyPlaying = React.useMemo(() => {
        return !!(userAddress && players.length > 0 && 
            players.some((player: PlayerDTO) => player.address?.toLowerCase() === userAddress));
    }, [players, userAddress]);

    // Function to check if a specific seat is vacant
    const isSeatVacant = React.useCallback(
        (seatIndex: number) => {
            return !players.some(
                (player: PlayerDTO) => player.seat === seatIndex &&
                isValidPlayerAddress(player.address)
            );
        },
        [players]
    );

    // Get array of all empty seat indexes - optimized to avoid repeated function calls
    const emptySeatIndexes: number[] = React.useMemo(() => {
        // Game state not loaded yet — no seats to show
        if (maxPlayers === undefined) return [];

        if (players.length === 0) {
            // If no players, all seats are empty
            return Array.from({ length: maxPlayers }, (_, i) => i + 1);
        }

        const occupiedSeats = new Set(
            players
                .filter(player => isValidPlayerAddress(player.address))
                .map(player => player.seat)
        );

        const emptySeatNumbers: number[] = [];
        for (let seatIndex = 1; seatIndex <= maxPlayers; seatIndex++) {
            if (!occupiedSeats.has(seatIndex)) {
                emptySeatNumbers.push(seatIndex);
            }
        }

        return emptySeatNumbers;
    }, [players, maxPlayers]);

    // Function to check if a user can join a specific seat
    const canJoinSeat = React.useCallback(
        (seatIndex: number) => {
            const vacant = isSeatVacant(seatIndex);
            const canJoin = !isUserAlreadyPlaying && vacant;
            console.log("🔍 useVacantSeatData.canJoinSeat:", {
                seatIndex,
                isUserAlreadyPlaying,
                isSeatVacant: vacant,
                canJoin,
                userAddress,
                playersCount: players.length
            });
            return canJoin;
        },
        [isSeatVacant, isUserAlreadyPlaying, userAddress, players.length]
    );

    // Get array of all empty seat indexes that the user can join
    const availableSeatIndexes = React.useMemo(() => {
        return isUserAlreadyPlaying ? [] : emptySeatIndexes;
    }, [emptySeatIndexes, isUserAlreadyPlaying]);

    return {
        isUserAlreadyPlaying,
        isSeatVacant,
        canJoinSeat,
        emptySeatIndexes,        // NEW: Array of all empty seat numbers
        availableSeatIndexes,    // NEW: Array of seats user can actually join
        isLoading,
        error
    };
};