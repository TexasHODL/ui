// Mock for @reown/appkit/react - ESM package that Jest can't parse
module.exports = {
    useAppKit: jest.fn(() => ({
        open: jest.fn(),
        close: jest.fn()
    })),
    useAppKitAccount: jest.fn(() => ({
        address: undefined,
        isConnected: false,
        caipAddress: undefined,
        status: 'disconnected'
    })),
    useDisconnect: jest.fn(() => ({
        disconnect: jest.fn()
    })),
    useAppKitProvider: jest.fn(() => ({
        walletProvider: undefined
    })),
    useAppKitState: jest.fn(() => ({
        open: false,
        selectedNetworkId: undefined
    }))
};
