import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useProfileAvatar } from "../../context/profile/ProfileAvatarContext";
import { truncateMiddle } from "../../utils/stringUtils";
import type { TournamentStandingRow } from "../../utils/tournamentTables";
import { TournamentPodium } from "./TournamentPodium";

jest.mock("../../context/profile/ProfileAvatarContext", () => ({ useProfileAvatar: jest.fn() }));

const FIRST = "b5218gn68fyexs68jghac9hjx72x0ma8nf95743cq2";
const SECOND = "b521xs8zhn0xamupn7xc48m09wvcd7pvk3yy5l4kdlzs";
const THIRD = "b521p78923d2qjzfywxojdy0hgzlrfrhgz80ujhwk";
const FOURTH = "b5218mqpr7x32bxs5m3c0suv7j7rjhnrn4kpy29mdm";
const FIRST_IMAGE = "https://nft-cdn.alchemy.com/eth-mainnet/first";
const THIRD_IMAGE = "https://nft-cdn.alchemy.com/eth-mainnet/third";

const mockAvatars = (byAddress: Record<string, string | null> = {}) => {
    const getAvatarForAddress = jest.fn((address?: string) => (address ? (byAddress[address] ?? null) : null));
    (useProfileAvatar as jest.Mock).mockReturnValue({ getAvatarForAddress });
    return getAvatarForAddress;
};

const renderPodium = (rows: TournamentStandingRow[], viewer?: string) =>
    render(
        <MemoryRouter>
            <TournamentPodium standings={rows} viewer={viewer} />
        </MemoryRouter>
    );

const defaultStandings: TournamentStandingRow[] = [
    { place: 1, address: FIRST, payout: "8000000" },
    { place: 2, address: SECOND, payout: "4800000" },
    { place: 3, address: THIRD, payout: "3200000" },
    { place: 4, address: FOURTH, payout: "0" }
];

describe("TournamentPodium", () => {
    beforeEach(() => jest.clearAllMocks());

    it("places 2nd left, 1st centre and tallest, and 3rd right, with green prizes and shortened addresses", () => {
        mockAvatars();
        renderPodium(defaultStandings);

        const slots = screen.getAllByTestId(/tournament-podium-place-/);
        expect(slots.map(slot => slot.getAttribute("data-place"))).toEqual(["2", "1", "3"]);
        expect(screen.getByTestId("tournament-podium-place-1")).toHaveTextContent("1st");
        expect(screen.getByTestId("tournament-podium-place-2")).toHaveTextContent("2nd");
        expect(screen.getByTestId("tournament-podium-place-3")).toHaveTextContent("3rd");

        expect(screen.getByRole("link", { name: truncateMiddle(FIRST, 8, 4) })).toHaveAttribute("href", `/players/${FIRST}`);
        expect(screen.getByRole("link", { name: truncateMiddle(SECOND, 8, 4) })).toHaveAttribute("href", `/players/${SECOND}`);
        expect(screen.getByRole("link", { name: truncateMiddle(THIRD, 8, 4) })).toHaveAttribute("href", `/players/${THIRD}`);
        expect(screen.queryByText(FIRST)).not.toBeInTheDocument();

        const firstPrize = screen.getByTestId("tournament-podium-prize-1");
        expect(firstPrize).toHaveTextContent("$8.00");
        expect(firstPrize).toHaveClass("tournament-balance-enough");
        expect(screen.getByTestId("tournament-podium-prize-2")).toHaveTextContent("$4.80");
        expect(screen.getByTestId("tournament-podium-prize-2")).toHaveClass("tournament-balance-enough");
        expect(screen.getByTestId("tournament-podium-prize-3")).toHaveTextContent("$3.20");
        expect(screen.queryByText(truncateMiddle(FOURTH, 8, 4))).not.toBeInTheDocument();
    });

    it("shows a registered NFT for a player who has one, and the default avatar otherwise", () => {
        const getAvatarForAddress = mockAvatars({ [FIRST]: FIRST_IMAGE, [THIRD]: THIRD_IMAGE });
        const { container } = renderPodium(defaultStandings);

        const images = container.querySelectorAll("img");
        expect(images).toHaveLength(2);
        expect(images[0]).toHaveAttribute("src", FIRST_IMAGE);
        expect(images[1]).toHaveAttribute("src", THIRD_IMAGE);
        expect(screen.getAllByTestId("tournament-podium-default-avatar")).toHaveLength(1);
        expect(getAvatarForAddress).toHaveBeenCalledWith(FIRST);
        expect(getAvatarForAddress).toHaveBeenCalledWith(SECOND);
        expect(getAvatarForAddress).toHaveBeenCalledWith(THIRD);
    });

    it("keeps 1st in the centre when only the winner has finished", () => {
        mockAvatars();
        renderPodium([{ place: 1, address: FIRST, payout: "18000" }]);

        const stage = screen.getByTestId("tournament-podium");
        expect(stage.children).toHaveLength(3);
        expect(stage.children[1]).toHaveAttribute("data-place", "1");
        expect(screen.getByTestId("tournament-podium-place-1")).toBeInTheDocument();
        expect(screen.queryByTestId("tournament-podium-place-2")).not.toBeInTheDocument();
        expect(screen.queryByTestId("tournament-podium-place-3")).not.toBeInTheDocument();
    });

    it("renders nothing when there is no top-three finish yet", () => {
        mockAvatars();
        const { container } = renderPodium([{ place: 7, address: FOURTH, payout: "0" }]);
        expect(container).toBeEmptyDOMElement();
    });

    it("highlights the viewer's address", () => {
        mockAvatars();
        renderPodium(defaultStandings, SECOND);
        expect(screen.getByRole("link", { name: truncateMiddle(SECOND, 8, 4) })).toHaveClass("viewer");
    });
});
