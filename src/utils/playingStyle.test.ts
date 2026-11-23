import { formatIndexerPlayingStyle, PLAYING_STYLE_FIGURES } from "./playingStyle";

const andrew = {
    total_hands: 1808,
    total_calls: 1832,
    vpip: 3960,
    pfr: 973,
    aggression_factor: 62,
    wtsd: 923,
    won_at_showdown: 4790
};

describe("formatIndexerPlayingStyle", () => {
    it("divides the indexer's ×100 fields and leaves aggression as a ratio", () => {
        expect(formatIndexerPlayingStyle(andrew)).toEqual({
            vpip: "39.60%",
            pfr: "9.73%",
            aggression: "0.62",
            wtsd: "9.23%",
            wssd: "47.90%"
        });
    });

    it("shows a dash when there are no hands, and for aggression when there are no calls", () => {
        expect(formatIndexerPlayingStyle({ ...andrew, total_hands: 0, vpip: 0, pfr: 0, wtsd: 0, won_at_showdown: 0 })).toEqual({
            vpip: "—",
            pfr: "—",
            aggression: "—",
            wtsd: "—",
            wssd: "—"
        });
        expect(formatIndexerPlayingStyle(undefined)).toEqual({
            vpip: "—",
            pfr: "—",
            aggression: "—",
            wtsd: "—",
            wssd: "—"
        });
        expect(formatIndexerPlayingStyle({ ...andrew, total_calls: 0, aggression_factor: 0 }).aggression).toBe("—");
        expect(formatIndexerPlayingStyle({ ...andrew, total_hands: 4, vpip: 0, pfr: 0, wtsd: 0, won_at_showdown: 0 })).toEqual({
            vpip: "0.00%",
            pfr: "0.00%",
            aggression: "0.62",
            wtsd: "0.00%",
            wssd: "0.00%"
        });
    });
});

describe("PLAYING_STYLE_FIGURES", () => {
    it("names each figure in full and explains the indexer's definition", () => {
        expect(PLAYING_STYLE_FIGURES.map(figure => [figure.title, figure.name, figure.explanation])).toEqual([
            [
                "VPIP",
                "Voluntarily put money in pot",
                "How often you voluntarily put chips in preflop — a call, raise or all-in, not posting blinds — measured over all hands you were dealt into."
            ],
            [
                "PFR",
                "Preflop raise",
                "How often you raised preflop, measured over all hands you were dealt into. Only a raise counts; an all-in is left out because the log cannot tell a shove that raises from one that only calls."
            ],
            [
                "Aggression",
                "Aggression",
                "Bets, raises and all-ins divided by calls, across every street. Above 1 means you bet more than you call. Shown as a dash when you have no calls."
            ],
            [
                "WTSD",
                "Went to showdown",
                "How often you reached showdown, measured over all hands you were dealt into, not only the hands where you saw the flop."
            ],
            ["W$SD", "Won money at showdown", "Of the hands that reached showdown, how often you won."]
        ]);
    });
});
