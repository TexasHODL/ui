import { searchWithoutJoinSeat } from "./urlParams";

describe("searchWithoutJoinSeat", () => {
    it("drops a seat deep link and leaves other params", () => {
        expect(searchWithoutJoinSeat("seat=3")).toBe("");
        expect(searchWithoutJoinSeat("watch=1&seat=4")).toBe("watch=1");
        expect(searchWithoutJoinSeat("seat=2&hand=8")).toBe("hand=8");
    });
    it("returns null when there is no seat to drop", () => {
        expect(searchWithoutJoinSeat("watch=1")).toBeNull();
        expect(searchWithoutJoinSeat("")).toBeNull();
    });
});
