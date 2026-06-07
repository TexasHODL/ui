/**
 * CSPRNG deck shuffle for gateway test mode (ui#440).
 *
 * With the chain off there is no VRF entropy source, so hands on
 * gateway-only tables would play with the engine's deterministic default
 * deck (poker-vm#2221). Until chain-anchored hand starts land
 * (pokerchain#217), the client shuffles with webcrypto when it starts a
 * new hand. TEST MODE ONLY: the shuffling client knows the deck order.
 *
 * Format matches the SDK Deck constructor: 52 dash-joined mnemonics
 * (ten is "T"), e.g. "7H-AC-TD-...".
 */

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const SUITS = ["C", "D", "H", "S"];

export function generateShuffledDeck(): string {
    const cards: string[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            cards.push(`${rank}${suit}`);
        }
    }

    // Fisher-Yates with rejection-sampled webcrypto randomness (no modulo bias).
    const random = new Uint32Array(cards.length);
    crypto.getRandomValues(random);
    for (let i = cards.length - 1; i > 0; i--) {
        let r = random[i];
        const bound = 4294967296 - (4294967296 % (i + 1));
        while (r >= bound) {
            const one = new Uint32Array(1);
            crypto.getRandomValues(one);
            r = one[0];
        }
        const j = r % (i + 1);
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards.join("-");
}
