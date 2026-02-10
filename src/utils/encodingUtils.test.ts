import { base64ToHex } from "./encodingUtils";

describe("encodingUtils", () => {
    describe("base64ToHex", () => {
        it("should convert simple base64 string to hex", () => {
            // "Hello" in base64 is "SGVsbG8="
            expect(base64ToHex("SGVsbG8=")).toBe("0x48656c6c6f");
        });

        it("should convert base64 to hex with 0x prefix", () => {
            const result = base64ToHex("AQID");
            expect(result).toMatch(/^0x/);
        });

        it("should handle single character", () => {
            // "A" in base64 is "QQ=="
            expect(base64ToHex("QQ==")).toBe("0x41");
        });

        it("should handle multi-byte sequences", () => {
            // "ABC" in base64 is "QUJD"
            expect(base64ToHex("QUJD")).toBe("0x414243");
        });

        it("should pad hex values with leading zeros", () => {
            // Null byte "\x00" in base64 is "AA=="
            expect(base64ToHex("AA==")).toBe("0x00");
        });

        it("should handle longer strings", () => {
            // "Hello World!" in base64 is "SGVsbG8gV29ybGQh"
            expect(base64ToHex("SGVsbG8gV29ybGQh")).toBe("0x48656c6c6f20576f726c6421");
        });

        it("should convert binary data correctly", () => {
            // Test with known binary data: [0x01, 0x02, 0x03, 0xFF]
            // Base64: "AQID/w=="
            expect(base64ToHex("AQID/w==")).toBe("0x010203ff");
        });

        it("should handle base64 without padding", () => {
            // "Hi" in base64 can be "SGk" (without padding)
            expect(base64ToHex("SGk")).toBe("0x4869");
        });

        it("should maintain byte order", () => {
            // Verify that byte order is preserved
            // [0xAB, 0xCD, 0xEF] -> "q83v" in base64
            expect(base64ToHex("q83v")).toBe("0xabcdef");
        });

        it("should handle empty string", () => {
            expect(base64ToHex("")).toBe("0x");
        });
    });
});
