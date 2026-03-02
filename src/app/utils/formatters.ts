/**
 * Utility to format stock/crypto symbols for display.
 * Removes 'USD' from stock/crypto names EXCEPT for Bitcoin.
 */
export const formatSymbolDisplay = (symbol: string | null | undefined): string => {
    if (!symbol) return "";

    // Exception for Bitcoin
    if (symbol === "BTC/USD" || symbol === "BTCUSD") {
        return symbol;
    }

    // Remove /USD or USD from the end
    if (symbol.endsWith("/USD")) {
        return symbol.replace("/USD", "");
    }

    if (symbol.endsWith("USD")) {
        return symbol.replace("USD", "");
    }

    return symbol;
};
