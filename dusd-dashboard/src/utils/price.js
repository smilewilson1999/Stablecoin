import { ethers } from "ethers";

// Get current DUSD price
export async function getDUSDPrice() {
	try {
		const response = await fetch("/api/price", {
			method: "POST",
		});
		const data = await response.json();
		return data.success ? data.currentPrice : null;
	} catch (error) {
		console.error("Error fetching DUSD price:", error);
		return null;
	}
}

// Get current reserve value
export async function getReserveValue() {
	try {
		const response = await fetch("/api/price", {
			method: "POST",
		});
		const data = await response.json();
		return data.success && data.reserveValue ? data.reserveValue : null;
	} catch (error) {
		console.error("Error fetching reserve value:", error);
		return null;
	}
}

// Get reserve value history for chart
export async function getReserveValueHistory(hours = 24) {
	try {
		const response = await fetch("/api/price", {
			method: "POST",
		});

		const data = await response.json();
		if (!data.success || !data.reserveHistory) {
			return [];
		}

		console.log("Reserve history from API:", data.reserveHistory);

		const now = new Date();
		const cutoff = new Date(now - hours * 60 * 60 * 1000);

		return data.reserveHistory
			.filter((point) => new Date(point.timestamp) > cutoff)
			.map((point) => ({
				time: new Date(point.timestamp).toLocaleTimeString(),
				value: point.totalValue,
				usdtValue: point.usdtBalance,
				duduValue: point.duduBalance * point.duduPrice,
			}));
	} catch (error) {
		console.error("[getReserveValueHistory] Error:", error);
		return [];
	}
}

// Get price history from database
export async function readPriceHistory(token = "DUSD") {
	try {
		const response = await fetch(`/api/price?token=${token}`);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(`Error reading ${token} price history:`, error);
		return [];
	}
}

// Format history data for chart
export async function getChartData(token = "DUSD", hours = 24) {
	const history = await readPriceHistory(token);
	const now = new Date();
	const cutoff = new Date(now - hours * 60 * 60 * 1000);

	return history
		.filter((point) => new Date(point.timestamp) > cutoff)
		.map((point) => ({
			time: new Date(point.timestamp).toLocaleTimeString(),
			price: point.price,
		}));
}

// Helper to format large numbers
export function formatNumber(num, decimals = 2) {
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(num);
}

// Calculate price change percentage
export function calculatePriceChange(currentPrice, previousPrice) {
	if (!previousPrice) return 0;
	return ((currentPrice - previousPrice) / previousPrice) * 100;
}
