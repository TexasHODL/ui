import { profileHistoryHandsPending } from "./profileStatsLoading";

describe("profileHistoryHandsPending", () => {
    it("is true only while the indexer hand list is still loading on Stats", () => {
        expect(profileHistoryHandsPending({ onStatsTab: true, hasAddress: true, handListFailed: false, handListComplete: false })).toBe(true);
        expect(profileHistoryHandsPending({ onStatsTab: true, hasAddress: true, handListFailed: false, handListComplete: true })).toBe(false);
        expect(profileHistoryHandsPending({ onStatsTab: true, hasAddress: true, handListFailed: true, handListComplete: false })).toBe(false);
        expect(profileHistoryHandsPending({ onStatsTab: false, hasAddress: true, handListFailed: false, handListComplete: false })).toBe(false);
    });
});
