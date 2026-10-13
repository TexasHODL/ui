/**
 * Display names for tables that were created without a paid custom name.
 *
 * A user-set name (the optional "Table Name" field, poker-vm#337) is always
 * shown as stored. Otherwise the name is chosen from a curated list by a
 * FNV-1a 64-bit hash of the full table id, so every player sees the same name
 * and it stays put across reloads.
 *
 * Each entry is a hand-written two-word name in Title Case, themed on poker,
 * crypto, or degen gambling. For example "Satoshi's Flush" or "Diamond Hands".
 *
 * Display only. This module never writes a table id or any on-chain field.
 */

import { hasContent } from "./guards";

/** Curated two-word table names. Title Case, one space, no hyphen. */
export const GENERATED_TABLE_NAMES: readonly string[] = [
    "All In",
    "Royal Flush",
    "Pocket Rockets",
    "Bad Beat",
    "Big Slick",
    "Poker Face",
    "Main Event",
    "Texas Dolly",
    "Seven Deuce",
    "Ship It",
    "Slow Roll",
    "Hero Call",
    "Crying Call",
    "Nut Flush",
    "Full House",
    "Straight Flush",
    "Pocket Aces",
    "Check Raise",
    "Blind Steal",
    "Final Table",
    "Bubble Boy",
    "Heads Up",
    "Chip Leader",
    "Short Stack",
    "High Stakes",
    "No Limit",
    "Pot Limit",
    "Drawing Dead",
    "Runner Runner",
    "Calling Station",
    "Card Shark",
    "Dealer's Choice",
    "Value Town",
    "Ante Up",
    "Dead Money",
    "Bomb Pot",
    "Run Twice",
    "Steel Wheel",
    "Quad Aces",
    "Cracked Aces",
    "Set Mine",
    "String Bet",
    "Rabbit Hunt",
    "Shot Clock",
    "Hole Cards",
    "Squeeze Play",
    "Slow Play",
    "Pure Bluff",
    "Snap Call",
    "Pot Odds",
    "Small Blind",
    "Big Blind",
    "Cash Game",
    "River Card",
    "Ace King",
    "Pocket Kings",
    "Double Barrel",
    "Triple Barrel",
    "Donk Bet",
    "Cowboy Kings",
    "Blind War",
    "Knockout Bounty",
    "Mystery Bounty",
    "Table Stakes",
    "Rail Bird",
    "Nosebleed Game",
    "Classic Cooler",
    "Dirty Suckout",
    "Showdown Saloon",
    "Jackpot Drop",
    "Satoshi's Flush",
    "Bitcoin Bluff",
    "Whale Raise",
    "Block Bluff",
    "Ledger Limp",
    "Hodl Em",
    "Crypto Cooler",
    "Moon River",
    "Satoshi Shove",
    "Bitcoin Nuts",
    "Bitcoin Showdown",
    "Bitcoin Rockets",
    "Bitcoin Mine",
    "Bitcoin Bubble",
    "Whale Pot",
    "Whale Stack",
    "Whale Button",
    "Hodl Fold",
    "Crypto Flop",
    "Whale Nuts",
    "Bitcoin Felt",
    "Lambo Shove",
    "Genesis Flop",
    "Crypto Showdown",
    "Bitcoin Aces",
    "Crypto Ante",
    "Whale Flop",
    "Hodl Call",
    "Block Raise",
    "Chain Bluff",
    "Satoshi's Bluff",
    "Satoshi's Nuts",
    "Ledger Shove",
    "Wallet Rekt",
    "Token Tilt",
    "Bitcoin Tilt",
    "Hodl Tilt",
    "Whale Rekt",
    "Crypto Rekt",
    "Lambo Yolo",
    "Bitcoin Yolo",
    "Token Ape",
    "Crypto Degen",
    "Bitcoin Degen",
    "Token Rug",
    "Bitcoin Fomo",
    "Crypto Bull",
    "Bitcoin Bear",
    "Bitcoin Candle",
    "Airdrop Ticket",
    "Bitcoin Jackpot",
    "Lambo Ticket",
    "Moon Bag",
    "Crypto Lottery",
    "Bitcoin Roulette",
    "Bitcoin Parlay",
    "Airdrop Season",
    "Diamond Wallet",
    "Bitcoin Blackjack",
    "Crypto Slots",
    "Gas Squeeze",
    "Meme Rekt",
    "Doge Yolo",
    "Wen Rekt",
    "Bitcoin Bookie",
    "Moon Flush",
    "Rug Pull",
    "Lambo Lounge",
    "Full Send",
    "Degen Den",
    "Paper Hands",
    "Diamond Hands",
    "Bull Run",
    "Bluff Ridge",
    "High Roller",
    "On Tilt",
    "Parlay Card",
    "Snake Eyes",
    "Double Down",
    "Box Cars",
    "Pass Line",
    "Hot Shooter",
    "Pit Boss",
    "Sports Book",
    "Race Book",
    "Daily Double",
    "Exacta Box",
    "Trifecta Box",
    "Long Shot",
    "House Edge",
    "Even Money",
    "Money Line",
    "Point Spread",
    "Prop Bet",
    "Live Bet",
    "Sharp Money",
    "Public Money",
    "Stop Loss",
    "Take Profit",
    "Bear Trap",
    "Bull Trap",
    "Short Squeeze",
    "Exit Liquidity",
    "Bag Holder",
    "Moon Mission",
    "Moon Shot",
    "God Candle",
    "Green Candle",
    "Red Candle",
    "Wen Moon",
    "Wen Lambo",
    "Fomo Bid",
    "Down Bad",
    "Honey Pot",
    "Rekt City",
    "Alt Season",
    "Meme Season",
    "Ape Season",
    "Crypto Winter",
    "Defi Summer",
    "Weak Hands",
    "Lottery Ticket",
    "Twenty One",
    "Roulette Spin",
    "Craps Table",
    "Slot Machine",
    "Bingo Hall",
    "Keno Ticket",
    "Scratch Off",
    "Player's Club"
];

export const GENERATED_TABLE_NAME_LIST_SIZE = 200;

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const FNV_MASK = 0xffffffffffffffffn;

/** FNV-1a 64-bit over UTF-16 code units. Pure and stable across engines. */
function fnv1a64(value: string): bigint {
    let hash = FNV_OFFSET;
    for (let i = 0; i < value.length; i++) {
        hash ^= BigInt(value.charCodeAt(i));
        hash = (hash * FNV_PRIME) & FNV_MASK;
    }
    return hash;
}

/**
 * Title Case name for an unnamed table, e.g. "Diamond Hands".
 * Hashes the full table id, not a truncated suffix.
 */
export function generateTableName(tableId: string): string {
    const hash = fnv1a64(tableId);
    const index = Number(hash % BigInt(GENERATED_TABLE_NAMES.length));
    return GENERATED_TABLE_NAMES[index];
}

/**
 * Name to render. A non-blank custom name wins; surrounding whitespace is
 * trimmed and the rest is shown unchanged. Otherwise the generated name.
 */
export function displayTableName(customName: string | null | undefined, tableId: string): string {
    const custom = customName?.trim();
    if (hasContent(custom)) {
        return custom;
    }
    return generateTableName(tableId);
}
