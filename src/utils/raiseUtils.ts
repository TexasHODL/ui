import { ActionDTO, PlayerActionType, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { microToUsdc } from "../constants/currency";

/**
 * Calculate the total amount to display on the raise button.
 * This shows the TOTAL amount the player will have committed (not just the additional raise).
 *
 * @param playerSumOfBets - The player's current bet amount in the round (6 decimal micro-USDC format as string)
 * @param raiseAmount - The additional raise amount (in USDC as number)
 * @returns The total amount to display (current bet + raise amount)
 *
 * @example
 * // Player has bet $0.02, wants to raise by $0.02
 * calculateRaiseToDisplay("20000", 0.02) // Returns 0.04
 */
export const calculateRaiseToDisplay = (playerSumOfBets: string, raiseAmount: number): number => {
    // Game state uses 6 decimal micro-USDC format
    const currentBet = playerSumOfBets ? microToUsdc(playerSumOfBets) : 0;
    return currentBet + raiseAmount;
};

export const getRaiseToAmount = (raiseAmount: number, actions: ActionDTO[], currentRound: TexasHoldemRound, userAddress: string): number => {
    // If no actions, return raiseAmount
    if (!actions || actions.length === 0) {
        return raiseAmount;
    }

    // Get players previous actions
    const previousActions = actions.filter(action => action.playerId?.toLowerCase() === userAddress.toLowerCase());

    if (!previousActions || previousActions.length === 0) {
        // If no previous actions, return raiseAmount
        return raiseAmount;
    }

    const currentRoundActions: ActionDTO[] = previousActions.filter(action => action.round === currentRound);

    // If the current round is PREFLOP, include ante actions
    if (currentRound === TexasHoldemRound.PREFLOP) {
        const anteAction = previousActions.find(action => action.action === PlayerActionType.SMALL_BLIND || action.action === PlayerActionType.BIG_BLIND);
        if (anteAction) {
            // Add ante action to the current round actions
            currentRoundActions.push(anteAction);
        }
    }

    // Filter by bet and raise actions only
    const previousBetsAndRaises: ActionDTO[] = currentRoundActions.filter(
        action =>
            action.action === PlayerActionType.BET ||
            action.action === PlayerActionType.RAISE ||
            action.action === PlayerActionType.CALL ||
            action.action === PlayerActionType.SMALL_BLIND ||
            action.action === PlayerActionType.BIG_BLIND
    );

    // Sum the raise amount and previous bets/raises
    const totalPreviousBetsAndRaises: number = previousBetsAndRaises.reduce((sum, action) => {
        const amount = action.amount ? microToUsdc(action.amount) : 0;
        return sum + amount;
    }, 0);

    // Calculate the raise amount based on previous bets/raises
    // return raiseAmount > 0 ? raiseAmount + totalPreviousBetsAndRaises : minRaise;

    return raiseAmount + totalPreviousBetsAndRaises;
};