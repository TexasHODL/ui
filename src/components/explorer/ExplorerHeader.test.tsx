
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExplorerHeader } from "./ExplorerHeader";

describe("Consistent secondary page navigation", () => {
    it("keeps My hands focused on the player rather than explorer navigation", () => {
        render(
            <MemoryRouter initialEntries={["/hands"]}>
                <ExplorerHeader title="My Hands" />
            </MemoryRouter>
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My hands");
        expect(screen.queryByRole("navigation", { name: "Explorer sections" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "← Lobby" })).toHaveAttribute("href", "/");
    });
    it("marks the selected explorer section and retains all section links", () => {
        render(
            <MemoryRouter initialEntries={["/explorer/distribution"]}>
                <ExplorerHeader />
            </MemoryRouter>
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hand distribution");
        expect(screen.getByRole("link", { name: "Hand distribution" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("href", "/explorer/accounts");
        expect(screen.getByRole("link", { name: "Address lookup" })).toHaveAttribute("href", "/explorer/address");
        expect(screen.queryByRole("link", { name: "Awards" })).not.toBeInTheDocument();
    });
    it("keeps the other explorer sections and leaves Awards on the profile", () => {
        render(
            <MemoryRouter initialEntries={["/explorer"]}>
                <ExplorerHeader />
            </MemoryRouter>
        );
        const nav = screen.getByRole("navigation", { name: "Explorer sections" });
        expect(within(nav).getByRole("link", { name: "Latest blocks" })).toHaveAttribute("href", "/explorer");
        expect(within(nav).getByRole("link", { name: "Accounts" })).toHaveAttribute("href", "/explorer/accounts");
        expect(within(nav).getByRole("link", { name: "Address lookup" })).toHaveAttribute("href", "/explorer/address");
        expect(within(nav).getByRole("link", { name: "Hand distribution" })).toHaveAttribute("href", "/explorer/distribution");
        expect(within(nav).queryByRole("link", { name: "Awards" })).not.toBeInTheDocument();
    });
    it("keeps the Awards heading for the standalone awards page", () => {
        render(
            <MemoryRouter initialEntries={["/awards"]}>
                <ExplorerHeader title="Player Awards" />
            </MemoryRouter>
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Awards");
        expect(screen.getByText("The biggest nit, the maniac and the calling station.")).toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Explorer sections" })).not.toBeInTheDocument();
    });
    it("provides a useful parent link from player details", () => {
        render(
            <MemoryRouter initialEntries={["/players/test-address"]}>
                <ExplorerHeader title="Player profile" />
            </MemoryRouter>
        );
        expect(screen.getByRole("link", { name: "← Players" })).toHaveAttribute("href", "/players");
    });
});
