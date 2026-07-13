import { renderHook } from "@testing-library/react";
import { useGameStateSounds } from "./useGameStateSounds";
import { useGameEventsContext } from "../../context/gameState/GameEventsContext";
import { useActionSounds } from "./useActionSounds";
import { getCosmosAddressSync } from "../../utils/cosmosAccountUtils";
import { isGameBusEnabled } from "../../bus/featureFlag";
import { ActionDTO, PlayerActionType, NonPlayerActionType, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { DEFAULT_DECORATION, GameEvent, GameStreamItem, SoundHint } from "../../bus/types";

jest.mock("../../context/gameState/GameEventsContext");
jest.mock("./useActionSounds");
jest.mock("../../utils/cosmosAccountUtils");
jest.mock("../../bus/featureFlag");

const mockUseGameEventsContext = useGameEventsContext as jest.MockedFunction<typeof useGameEventsContext>;
const mockUseActionSounds = useActionSounds as jest.MockedFunction<typeof useActionSounds>;
const mockGetCosmosAddressSync = getCosmosAddressSync as jest.MockedFunction<typeof getCosmosAddressSync>;
const mockIsGameBusEnabled = isGameBusEnabled as jest.MockedFunction<typeof isGameBusEnabled>;

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

function makeItem(sounds: SoundHint[], events: GameEvent[] = []): GameStreamItem {
    return {
        seq: 1,
        receivedAt: 0,
        kind: "state",
        classified: { kind: "actionAccepted" } as GameStreamItem["classified"],
        events,
        decoration: { ...DEFAULT_DECORATION, sounds },
        raw: {}
    };
}

describe("useGameStateSounds", () => {
    const playActionSound = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseActionSounds.mockReturnValue({ playActionSound });
        mockGetCosmosAddressSync.mockReturnValue(LOCAL);
        mockIsGameBusEnabled.mockReturnValue(true); // bus path by default
        mockUseGameEventsContext.mockReturnValue({ latestItem: null });
    });

    describe("bus path — decoration.sounds hints", () => {
        it("plays the newest resolved sound hint", () => {
            mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([{ kind: "check" }, { kind: "bet" }]) });
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).toHaveBeenCalledTimes(1);
            expect(playActionSound).toHaveBeenCalledWith("bet");
        });

        it("plays nothing when there are no sound hints", () => {
            mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([]) });
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).not.toHaveBeenCalled();
        });

        it("does nothing when sounds are disabled", () => {
            mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([{ kind: "call" }]) });
            renderHook(() => useGameStateSounds(false));
            expect(playActionSound).not.toHaveBeenCalled();
        });

        it("does nothing before the first commit", () => {
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).not.toHaveBeenCalled();
        });
    });

    describe("direct path (VITE_GAME_BUS=off) — event fallback", () => {
        beforeEach(() => {
            mockIsGameBusEnabled.mockReturnValue(false);
        });

        it("plays a sound for a remote player's action", () => {
            mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([], [playerActed(10, REMOTE, PlayerActionType.CALL)]) });
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).toHaveBeenCalledWith("call");
        });

        it("does not play for the local player (already played optimistically)", () => {
            mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([], [playerActed(10, LOCAL, PlayerActionType.RAISE)]) });
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).not.toHaveBeenCalled();
        });

        it("plays only the newest action's sound", () => {
            mockUseGameEventsContext.mockReturnValue({
                latestItem: makeItem([], [
                    playerActed(10, REMOTE, PlayerActionType.CHECK),
                    playerActed(12, REMOTE, PlayerActionType.BET)
                ])
            });
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).toHaveBeenCalledTimes(1);
            expect(playActionSound).toHaveBeenCalledWith("bet");
        });

        it("preserves the blind->check mapping for a remote blind post", () => {
            mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([], [playerActed(10, REMOTE, PlayerActionType.BIG_BLIND)]) });
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).toHaveBeenCalledWith("check");
        });

        it("plays no sound for a non-player action that maps to null (deal)", () => {
            mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([], [playerActed(10, REMOTE, NonPlayerActionType.DEAL)]) });
            renderHook(() => useGameStateSounds(true));
            expect(playActionSound).not.toHaveBeenCalled();
        });
    });
});
