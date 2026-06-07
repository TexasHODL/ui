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

    it("renders nothing on the default chain transport", () => {
        delete process.env.VITE_GAME_TRANSPORT;
        render(<GatewayTransportBanner />);
        expect(screen.queryByTestId("gateway-transport-banner")).toBeNull();
    });

    it("shows the gateway URL when gateway transport is active", () => {
        process.env.VITE_GAME_TRANSPORT = "gateway";
        process.env.VITE_GATEWAY_URL = "https://pvm.block52.xyz/gateway";
        render(<GatewayTransportBanner />);
        const banner = screen.getByTestId("gateway-transport-banner");
        expect(banner.textContent).toContain("gateway transport");
        expect(banner.textContent).toContain("https://pvm.block52.xyz/gateway");
    });
});
