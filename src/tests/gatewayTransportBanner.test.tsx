import React from "react";
import { render, screen } from "@testing-library/react";

import { GatewayTransportBanner } from "../components/GatewayTransportBanner";

// jest maps utils/viteEnv to process.env (see jest.config.js).
describe("GatewayTransportBanner", () => {
    const saved = { transport: process.env.VITE_GAME_TRANSPORT, url: process.env.VITE_GATEWAY_URL };

    afterEach(() => {
        process.env.VITE_GAME_TRANSPORT = saved.transport;
        process.env.VITE_GATEWAY_URL = saved.url;
        if (saved.transport === undefined) delete process.env.VITE_GAME_TRANSPORT;
        if (saved.url === undefined) delete process.env.VITE_GATEWAY_URL;
    });

    it("shows by default — gateway is the default transport", () => {
        delete process.env.VITE_GAME_TRANSPORT;
        process.env.VITE_GATEWAY_URL = "https://pvm.block52.xyz/gateway";
        render(<GatewayTransportBanner />);
        const banner = screen.getByTestId("gateway-transport-banner");
        expect(banner.textContent).toContain("gateway transport");
        expect(banner.textContent).toContain("https://pvm.block52.xyz/gateway");
    });

    it("renders nothing when chain transport is opted into", () => {
        process.env.VITE_GAME_TRANSPORT = "chain";
        render(<GatewayTransportBanner />);
        expect(screen.queryByTestId("gateway-transport-banner")).toBeNull();
    });
});
