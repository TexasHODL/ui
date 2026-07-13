import { renderHook } from "@testing-library/react";
import { useGameStateSounds } from "./useGameStateSounds";
import { useGameEventsContext } from "../../context/gameState/GameEventsContext";
import { useActionSounds } from "./useActionSounds";
import { DEFAULT_DECORATION, GameEvent, GameStreamItem, SoundHint } from "../../bus/types";

jest.mock("../../context/gameState/GameEventsContext");
jest.mock("./useActionSounds");

const mockUseGameEventsContext = useGameEventsContext as jest.MockedFunction<typeof useGameEventsContext>;
const mockUseActionSounds = useActionSounds as jest.MockedFunction<typeof useActionSounds>;

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
        mockUseGameEventsContext.mockReturnValue({ latestItem: null });
    });

    describe("decoration.sounds hints", () => {
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
});
