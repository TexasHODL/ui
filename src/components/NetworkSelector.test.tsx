import { fireEvent, render, screen } from "@testing-library/react";
import { NetworkSelector } from "./NetworkSelector";

const mockSetNetwork = jest.fn();
const mockNetwork = { name: "Miller Services", rest: "https://node.tommillerservices.com", rpc: "https://example.test/rpc", ws: "wss://example.test/ws", grpc: "" };
jest.mock("../context/NetworkContext", () => ({
    useNetwork: () => ({ currentNetwork: mockNetwork, setNetwork: mockSetNetwork, availableNetworks: [mockNetwork], discoveredNetworks: [] })
}));

it("keeps the embedded node list in the parent menu and exposes its full endpoint", () => {
    render(<NetworkSelector embedded />);
    const toggle = screen.getByRole("button", { name: "Select network" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const option = screen.getByRole("button", { name: /Miller Services https:\/\/node.tommillerservices.com/ });
    expect(option.parentElement).toHaveClass("embeddedMenu");
    expect(option.parentElement).not.toHaveClass("floatingMenu");
    fireEvent.click(option);
    expect(mockSetNetwork).toHaveBeenCalledWith(mockNetwork);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
});

it("retains floating placement outside an embedded menu", () => {
    render(<NetworkSelector />);
    fireEvent.click(screen.getByRole("button", { name: "Select network" }));
    expect(screen.getByRole("button", { name: /Miller Services https:/ }).parentElement).toHaveClass("floatingMenu");
});
