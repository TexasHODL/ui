/**
 * GameSettingsContext
 *
 * Provides reactive game settings that are persisted in localStorage.
 * Settings can be toggled at runtime from the settings sidebar panel.
 *
 * Falls back to URL query params for initial values if no localStorage
 * value is present, preserving backwards compatibility.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { getAutoDealEnabled, getAutoPostBlindsEnabled, getAutoNewHandEnabled, getAutoFoldEnabled, getCallClockEnabled } from "../utils/urlParams";

const LS_KEY_AUTO_DEAL = "setting_autodeal";
const LS_KEY_AUTO_POST_BLINDS = "setting_autoblinds";
const LS_KEY_AUTO_NEW_HAND = "setting_autonewhand";
const LS_KEY_AUTO_FOLD = "setting_autofold";
const LS_KEY_AUTO_MUCK = "setting_automuck";
const LS_KEY_CALL_CLOCK = "setting_callclock";
const LS_KEY_TURN_SOUND = "setting_turnsound";
const LS_KEY_PLAYER_ACTION_SOUNDS = "setting_playeractionsounds";
const LS_KEY_SEAT_AT_BOTTOM = "setting_seatatbottom";
const LS_KEY_SITIN_OPTIONS = "setting_sitinoptions";
const LS_KEY_PRE_SELECT_CHECK = "setting_preselectcheck";
// Upstream leaves this off until the player opts in (ui#388). Ours is on until
// they turn it off. readBoolSetting only uses this when the key is missing, so
// a stored "false" stays off.
const PRE_SELECT_CHECK_DEFAULT = true;
const LS_KEY_LEFT_HAND = "setting_lefthand";
const LS_KEY_WIN_CELEBRATION = "setting_wincelebration";
const LS_KEY_POT_AS_CHIPS = "setting_potaschips";
const LS_KEY_SHOW_MAIN_POT = "setting_showmainpot";

function readBoolSetting(key: string, fallback: boolean): boolean {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === "true";
}

export interface GameSettings {
    autoDeal: boolean;
    autoPostBlinds: boolean;
    autoNewHand: boolean;
    autoFold: boolean;
    autoMuck: boolean;
    // When ON (default), this client calls the clock on an opponent whose turn
    // clock has run out and who has not acted (ui#819): it submits the chain's
    // `timeout` action, which the engine verifies before folding them. Observers
    // take turns from the dealer button, so one call lands per stalled turn.
    callClock: boolean;
    turnNotificationSound: boolean;
    playerActionSounds: boolean;
    seatAtBottom: boolean;
    // When OFF (default), taking a seat auto-sits-in (dealt in next hand). When ON,
    // the sit-in method radios are shown so the player chooses (ui#550/#551).
    sitInOptions: boolean;
    // On until the player turns it off. The Check/Fold box (ui#388) then appears
    // before your turn while checking would be free, so you can queue a Check/Fold
    // (check if free, fold to a bet). A missing saved value uses our default; a
    // stored false is kept. The queued intent itself stays ephemeral per-round.
    preSelectCheck: boolean;
    // Landscape phones only. When on, the action column sits on the left edge.
    leftHandMode: boolean;
    // When ON (default), the gold-chip win celebration plays on the winning seat
    // (ui#847). Turn OFF for a calmer table — the pot still awards, just without
    // the animation. Pairs with the winner banner (ui#848).
    winCelebration: boolean;
    // When ON (default), the pot shows as a chip stack + amount pill with a POT
    // caption, matching the player bets on the table (ui#772). When OFF, plain
    // "Total Pot: $x" text. A missing saved value uses this default; stored false stays off.
    potAsChips: boolean;
    // Show the separate Main Pot beside the total. OFF by default: two pot figures confused players.
    showMainPot: boolean;
}

export interface GameSettingsContextValue extends GameSettings {
    toggleAutoDeal: () => void;
    toggleAutoPostBlinds: () => void;
    toggleAutoNewHand: () => void;
    toggleAutoFold: () => void;
    toggleAutoMuck: () => void;
    toggleCallClock: () => void;
    toggleTurnNotificationSound: () => void;
    togglePlayerActionSounds: () => void;
    toggleSeatAtBottom: () => void;
    toggleSitInOptions: () => void;
    togglePreSelectCheck: () => void;
    toggleLeftHandMode: () => void;
    toggleWinCelebration: () => void;
    togglePotAsChips: () => void;
    toggleShowMainPot: () => void;
}

const GameSettingsContext = createContext<GameSettingsContextValue | null>(null);

export const GameSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [autoDeal, setAutoDeal] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_AUTO_DEAL, getAutoDealEnabled())
    );
    const [autoPostBlinds, setAutoPostBlinds] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_AUTO_POST_BLINDS, getAutoPostBlindsEnabled())
    );
    const [autoNewHand, setAutoNewHand] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_AUTO_NEW_HAND, getAutoNewHandEnabled())
    );
    const [autoFold, setAutoFold] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_AUTO_FOLD, getAutoFoldEnabled())
    );
    const [autoMuck, setAutoMuck] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_AUTO_MUCK, false)
    );
    const [callClock, setCallClock] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_CALL_CLOCK, getCallClockEnabled())
    );
    const [turnNotificationSound, setTurnNotificationSound] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_TURN_SOUND, true)
    );
    const [playerActionSounds, setPlayerActionSounds] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_PLAYER_ACTION_SOUNDS, true)
    );
    const [seatAtBottom, setSeatAtBottom] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_SEAT_AT_BOTTOM, true)
    );
    const [sitInOptions, setSitInOptions] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_SITIN_OPTIONS, false)
    );
    const [preSelectCheck, setPreSelectCheck] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_PRE_SELECT_CHECK, PRE_SELECT_CHECK_DEFAULT)
    );
    const [leftHandMode, setLeftHandMode] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_LEFT_HAND, false)
    );
    const [potAsChips, setPotAsChips] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_POT_AS_CHIPS, true)
    );
    const [showMainPot, setShowMainPot] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_SHOW_MAIN_POT, false)
    );

    const [winCelebration, setWinCelebration] = useState<boolean>(() =>
        readBoolSetting(LS_KEY_WIN_CELEBRATION, true)
    );

    const toggleAutoDeal = useCallback(() => {
        setAutoDeal(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_AUTO_DEAL, String(next));
            return next;
        });
    }, []);

    const toggleAutoPostBlinds = useCallback(() => {
        setAutoPostBlinds(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_AUTO_POST_BLINDS, String(next));
            return next;
        });
    }, []);

    const toggleAutoNewHand = useCallback(() => {
        setAutoNewHand(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_AUTO_NEW_HAND, String(next));
            return next;
        });
    }, []);

    const toggleAutoFold = useCallback(() => {
        setAutoFold(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_AUTO_FOLD, String(next));
            return next;
        });
    }, []);

    const toggleAutoMuck = useCallback(() => {
        setAutoMuck(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_AUTO_MUCK, String(next));
            return next;
        });
    }, []);

    const toggleCallClock = useCallback(() => {
        setCallClock(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_CALL_CLOCK, String(next));
            return next;
        });
    }, []);

    const toggleTurnNotificationSound = useCallback(() => {
        setTurnNotificationSound(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_TURN_SOUND, String(next));
            return next;
        });
    }, []);

    const togglePlayerActionSounds = useCallback(() => {
        setPlayerActionSounds(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_PLAYER_ACTION_SOUNDS, String(next));
            return next;
        });
    }, []);

    const toggleSeatAtBottom = useCallback(() => {
        setSeatAtBottom(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_SEAT_AT_BOTTOM, String(next));
            return next;
        });
    }, []);

    const toggleSitInOptions = useCallback(() => {
        setSitInOptions(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_SITIN_OPTIONS, String(next));
            return next;
        });
    }, []);

    const togglePreSelectCheck = useCallback(() => {
        setPreSelectCheck(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_PRE_SELECT_CHECK, String(next));
            return next;
        });
    }, []);

    const toggleLeftHandMode = useCallback(() => {
        setLeftHandMode(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_LEFT_HAND, String(next));
            return next;
        });
    }, []);

    const toggleWinCelebration = useCallback(() => {
        setWinCelebration(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_WIN_CELEBRATION, String(next));
            return next;
        });
    }, []);

    const togglePotAsChips = useCallback(() => {
        setPotAsChips(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_POT_AS_CHIPS, String(next));
            return next;
        });
    }, []);

    const toggleShowMainPot = useCallback(() => {
        setShowMainPot(prev => {
            const next = !prev;
            localStorage.setItem(LS_KEY_SHOW_MAIN_POT, String(next));
            return next;
        });
    }, []);

    const value = useMemo<GameSettingsContextValue>(
        () => ({
            autoDeal,
            autoPostBlinds,
            autoNewHand,
            autoFold,
            autoMuck,
            callClock,
            turnNotificationSound,
            playerActionSounds,
            seatAtBottom,
            sitInOptions,
            preSelectCheck,
            leftHandMode,
            winCelebration,
            potAsChips,
            showMainPot,
            toggleAutoDeal,
            toggleAutoPostBlinds,
            toggleAutoNewHand,
            toggleAutoFold,
            toggleAutoMuck,
            toggleCallClock,
            toggleTurnNotificationSound,
            togglePlayerActionSounds,
            toggleSeatAtBottom,
            toggleSitInOptions,
            togglePreSelectCheck,
            toggleLeftHandMode,
            toggleWinCelebration,
            togglePotAsChips,
            toggleShowMainPot
        }),
        [
            autoDeal,
            autoPostBlinds,
            autoNewHand,
            autoFold,
            autoMuck,
            callClock,
            turnNotificationSound,
            playerActionSounds,
            seatAtBottom,
            sitInOptions,
            preSelectCheck,
            leftHandMode,
            winCelebration,
            potAsChips,
            showMainPot,
            toggleAutoDeal,
            toggleAutoPostBlinds,
            toggleAutoNewHand,
            toggleAutoFold,
            toggleAutoMuck,
            toggleCallClock,
            toggleTurnNotificationSound,
            togglePlayerActionSounds,
            toggleSeatAtBottom,
            toggleSitInOptions,
            togglePreSelectCheck,
            toggleLeftHandMode,
            toggleWinCelebration,
            togglePotAsChips,
            toggleShowMainPot
        ]
    );

    return <GameSettingsContext.Provider value={value}>{children}</GameSettingsContext.Provider>;
};

/**
 * Dev-only (/table-preview): override some settings for a subtree, keeping the
 * rest from the real provider. Lets the preview pin which hero controls show.
 */
export const GameSettingsOverride: React.FC<{ overrides: Partial<GameSettingsContextValue>; children: React.ReactNode }> = ({ overrides, children }) => {
    const parent = useGameSettings();
    const value = useMemo(() => ({ ...parent, ...overrides }), [parent, overrides]);
    return <GameSettingsContext.Provider value={value}>{children}</GameSettingsContext.Provider>;
};

export const useGameSettings = (): GameSettingsContextValue => {
    const context = useContext(GameSettingsContext);
    if (!context) {
        throw new Error("useGameSettings must be used within a GameSettingsProvider");
    }
    return context;
};
