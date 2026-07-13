import { renderHook } from "@testing-library/react";
import { useGameStateSounds } from "./useGameStateSounds";
import { useGameEvents } from "../game/useGameEvents";
import { useActionSounds } from "./useActionSounds";
import { getCosmosAddressSync } from "../../utils/cosmosAccountUtils";
import { ActionDTO, PlayerActionType, NonPlayerActionType, TexasHoldemRound } from "@block52/poker-vm-sdk";
import type { GameEvent } from "../../bus/types";

jest.mock("../game/useGameEvents");
jest.mock("./useActionSounds");
jest.mock("../../utils/cosmosAccountUtils");

const mockUseGameEvents = useGameEvents as jest.MockedFunction<typeof useGameEvents>;
const mockUseActionSounds = useActionSounds as jest.MockedFunction<typeof useActionSounds>;
const mockGetCosmosAddressSync = getCosmosAddressSync as jest.MockedFunction<typeof getCosmosAddressSync>;

const LOCAL = "b521localplayer";
const REMOTE = "b521remoteplayer";

function playerActed(index: number, playerId: string, action: PlayerActionType | NonPlayerActionType): Extract<GameEvent, { type: "playerActed" }> {
    const dto: ActionDTO = {
        playerId,
        seat: playerId === LOCAL ? 1 : 4,
        action,
        amount: "0",
        round: TexasHoldemRound.PREFLOP,
        index,
        timestamp: index
    };
    return { type: "playerActed", action: dto };
}

describe("useGameStateSounds", () => {
    const playActionSound = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseActionSounds.mockReturnValue({ playActionSound });
        mockGetCosmosAddressSync.mockReturnValue(LOCAL);
        // Default: no events (the useGameEvents mock is typed to accept a filter).
        mockUseGameEvents.mockReturnValue([] as never);
    });

    function setPlayerActed(events: Array<Extract<GameEvent, { type: "playerActed" }>>) {
        mockUseGameEvents.mockReturnValue(events as never);
    }

    it("plays a sound for a remote player's action", () => {
        setPlayerActed([playerActed(10, REMOTE, PlayerActionType.CALL)]);
        renderHook(() => useGameStateSounds(true));
        expect(playActionSound).toHaveBeenCalledTimes(1);
        expect(playActionSound).toHaveBeenCalledWith("call");
    });

    it("does not play a sound for the local player (already played optimistically)", () => {
        setPlayerActed([playerActed(10, LOCAL, PlayerActionType.RAISE)]);
        renderHook(() => useGameStateSounds(true));
        expect(playActionSound).not.toHaveBeenCalled();
    });

    it("does nothing when sounds are disabled", () => {
        setPlayerActed([playerActed(10, REMOTE, PlayerActionType.CALL)]);
        renderHook(() => useGameStateSounds(false));
        expect(playActionSound).not.toHaveBeenCalled();
    });

    it("does nothing when there are no playerActed events (no history replay)", () => {
        setPlayerActed([]);
        renderHook(() => useGameStateSounds(true));
        expect(playActionSound).not.toHaveBeenCalled();
    });

    it("plays only the newest action's sound when a commit carries several", () => {
        setPlayerActed([
            playerActed(10, REMOTE, PlayerActionType.CHECK),
            playerActed(11, REMOTE, PlayerActionType.CHECK),
            playerActed(12, REMOTE, PlayerActionType.BET)
        ]);
        renderHook(() => useGameStateSounds(true));
        expect(playActionSound).toHaveBeenCalledTimes(1);
        expect(playActionSound).toHaveBeenCalledWith("bet");
    });

    it("preserves the blind->check sound mapping for a remote blind post", () => {
        setPlayerActed([playerActed(10, REMOTE, PlayerActionType.BIG_BLIND)]);
        renderHook(() => useGameStateSounds(true));
        expect(playActionSound).toHaveBeenCalledWith("check");
    });

    it("plays no sound for a non-player action that maps to null (deal)", () => {
        setPlayerActed([playerActed(10, REMOTE, NonPlayerActionType.DEAL)]);
        renderHook(() => useGameStateSounds(true));
        expect(playActionSound).not.toHaveBeenCalled();
    });
});
