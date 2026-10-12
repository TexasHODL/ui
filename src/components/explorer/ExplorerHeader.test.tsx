import React from "react";
import { render, screen } from "@testing-library/react";
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
