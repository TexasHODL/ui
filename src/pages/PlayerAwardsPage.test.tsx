import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlayerAwardsPage from "./PlayerAwardsPage";

jest.mock("../components/players/AwardCard", () => ({
    AwardCard: () => null
}));

jest.mock("../hooks/player/usePlayerAwards", () => ({
    usePlayerAwards: () => ({
        awards: [],
        rankedPlayers: 0,
        failedPlayers: 0,
        loading: false,
        error: null,
        refetch: jest.fn()
    })
}));

const renderPage = (embedded: boolean) =>
    render(
        <MemoryRouter initialEntries={["/awards"]}>
            <PlayerAwardsPage embedded={embedded} />
        </MemoryRouter>
    );

it("keeps the page heading on the standalone awards page", () => {
    renderPage(false);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Awards");
    expect(screen.getByText("The biggest nit, the maniac and the calling station.")).toBeInTheDocument();
    expect(screen.getByText("Nobody has played enough to win anything yet.")).toBeInTheDocument();
});

it("embeds the leaderboard without the page heading or breadcrumb", () => {
    renderPage(true);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "← Lobby" })).not.toBeInTheDocument();
    expect(screen.queryByText("The biggest nit, the maniac and the calling station.")).not.toBeInTheDocument();
    expect(screen.getByText("Awards")).toBeInTheDocument();
    expect(screen.getByText("Nobody has played enough to win anything yet.")).toBeInTheDocument();
});
