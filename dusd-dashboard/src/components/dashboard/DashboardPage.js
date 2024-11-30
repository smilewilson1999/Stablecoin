"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	CircleDollarSign,
	Coins,
	BarChart3,
	ArrowUp,
	ArrowDown,
	RefreshCcw,
} from "lucide-react";
import {
	getDUSDPrice,
	getChartData,
	getReserveValue,
	getReserveValueHistory,
} from "../../utils/price";
import { fetchContractData } from "../../utils/contracts";
import { RefreshCw } from "lucide-react";

// Sample data for when API returns not ready or empty
const samplePriceHistory = [
	{ time: "04:00", price: 0.998 },
	{ time: "08:00", price: 1.001 },
	{ time: "12:00", price: 0.999 },
	{ time: "16:00", price: 1.0 },
	{ time: "20:00", price: 1.0 },
];

// Sample data for when API returns not ready or empty
const sampleReserveHistory = [
	{ time: "04:00", totalValue: 998000, usdtBalance: 800000, duduValue: 198000 },
	{
		time: "08:00",
		totalValue: 1001000,
		usdtBalance: 800000,
		duduValue: 201000,
	},
	{ time: "12:00", totalValue: 999000, usdtBalance: 800000, duduValue: 199000 },
	{
		time: "16:00",
		totalValue: 1000000,
		usdtBalance: 800000,
		duduValue: 200000,
	},
	{
		time: "20:00",
		totalValue: 1000000,
		usdtBalance: 800000,
		duduValue: 200000,
	},
];

const DashboardPage = () => {
	const [dusdPrice, setDusdPrice] = useState(1.0);
	const [priceChange, setPriceChange] = useState(0.0);
	const [totalSupply, setTotalSupply] = useState(0);
	const [usdtReserves, setUsdtReserves] = useState(0);
	const [duduReserves, setDuduReserves] = useState(0);
	const [priceHistory, setPriceHistory] = useState(samplePriceHistory);
	const [loading, setLoading] = useState(true);
	const [reserveValue, setReserveValue] = useState(null);
	const [reserveHistory, setReserveHistory] = useState(sampleReserveHistory);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const updateData = async () => {
		try {
			setLoading(true);
			// Get current price
			const currentPrice = await getDUSDPrice();
			if (currentPrice) {
				const prevPrice = dusdPrice;
				const change = ((currentPrice - prevPrice) / prevPrice) * 100;

				setDusdPrice(currentPrice);
				setPriceChange(change);
			}

			// Get current reserve value
			const reserveValue = await getReserveValue();
			if (reserveValue) {
				setReserveValue(reserveValue);
			}

			// Get reserve value history for chart
			const history = await getReserveValueHistory(24);
			if (history && history.length > 0) {
				setReserveHistory(history);
			}

			// Get stored price history for chart
			const chartData = await getChartData("DUSD", 24);
			if (chartData && chartData.length > 0) {
				setPriceHistory(chartData);
			}

			// Update other contract data
			const data = await fetchContractData();
			if (data) {
				setTotalSupply(Number.parseFloat(data.totalSupply));
				setUsdtReserves(Number.parseFloat(data.usdtReserves));
				setDuduReserves(Number.parseFloat(data.duduReserves));
			}
		} catch (error) {
			console.error("Error updating dashboard:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleManualRefresh = async () => {
		try {
			setIsRefreshing(true);
			await updateData();
		} catch (error) {
			console.error("Error refreshing data:", error);
		} finally {
			setIsRefreshing(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		updateData();
		const interval = setInterval(updateData, 5000); // Update every 5 seconds
		return () => clearInterval(interval);
	}, [dusdPrice]);

	return (
		<div className="min-h-screen bg-gradient-to-b from-yellow-100 to-green-100 p-6">
			<div className="max-w-7xl mx-auto">
				<header className="mb-8 flex items-center gap-4">
					<div className="relative w-12 h-12">
						<Image
							src="/DUSD-transparent.png"
							alt="DUSD Logo"
							fill
							className="object-contain"
							priority
						/>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-yellow-800">
							DUSD Dashboard
						</h1>
						<p className="text-yellow-600">
							Monitoring the Lovebirds Ecosystem
						</p>
					</div>
					<button
						type="button"
						onClick={handleManualRefresh}
						disabled={isRefreshing}
						className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 transition-colors"
					>
						<RefreshCcw
							className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
						/>
					</button>
				</header>

				{/* Price Card */}
				<Card className="mb-6 border-2 border-yellow-200 shadow-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CircleDollarSign className="text-green-600" />
							DUSD Price
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<div className="text-4xl font-bold text-yellow-800">
									${dusdPrice.toFixed(3)}
								</div>
								<div
									className={`flex items-center ${
										priceChange >= 0 ? "text-green-600" : "text-red-600"
									}`}
								>
									{priceChange >= 0 ? (
										<ArrowUp size={20} />
									) : (
										<ArrowDown size={20} />
									)}
									{Math.abs(priceChange).toFixed(2)}%
								</div>
							</div>
							<div className="h-40">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={priceHistory}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="rgba(202, 138, 4, 0.2)"
										/>
										<XAxis dataKey="time" stroke="#CA8A04" fontSize={12} />
										<YAxis
											domain={[0.95, 1.05]}
											stroke="#CA8A04"
											fontSize={12}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "rgba(254, 252, 232, 0.9)",
												border: "1px solid #CA8A04",
											}}
										/>
										<Line
											type="monotone"
											dataKey="price"
											stroke="#CA8A04"
											strokeWidth={2}
											dot={false}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Reserves Card */}
				<Card className="mb-6 border-2 border-yellow-200 shadow-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Coins className="text-green-600" />
							Reserve Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Left side - Metrics */}
							<div className="space-y-4">
								<div className="flex justify-between items-center">
									<span className="text-yellow-700">USDT Reserves</span>
									<span className="font-bold">
										${usdtReserves.toLocaleString()}
									</span>
								</div>

								<div className="flex justify-between items-center">
									<span className="text-yellow-700">DUDU Reserves</span>
									<div className="flex items-center gap-2">
										<div className="relative w-6 h-6">
											<Image
												src="/Duducoin-transparent.png"
												alt="DUDU Logo"
												fill
												className="object-contain"
											/>
										</div>
										<span className="font-bold">
											{duduReserves.toLocaleString()} DUDU
										</span>
									</div>
								</div>

								<div className="flex justify-between items-center border-t border-yellow-200 pt-4">
									<span className="text-yellow-700">Total Reserve Value</span>
									<span className="font-bold text-lg">
										${reserveValue?.totalValue.toLocaleString() ?? "0.00"}
									</span>
								</div>

								<div className="flex justify-between items-center text-sm text-yellow-600">
									<span>DUDU Price</span>
									<span>${reserveValue?.duduPrice.toFixed(3) ?? "0.080"}</span>
								</div>

								<div className="h-1 bg-yellow-100 rounded">
									<div
										className="h-1 bg-gradient-to-r from-yellow-400 to-green-400 rounded"
										style={{ width: "80%" }}
									/>
								</div>
							</div>

							{/* Right side - Chart */}
							<div className="h-40">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={reserveHistory}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="rgba(202, 138, 4, 0.2)"
										/>
										<XAxis dataKey="time" stroke="#CA8A04" fontSize={12} />
										<YAxis
											stroke="#CA8A04"
											fontSize={12}
											domain={[
												(dataMin) => Math.floor(dataMin * 0.95),
												(dataMax) => Math.ceil(dataMax * 1.05),
											]}
											tickFormatter={(value) =>
												`$${(value / 1000).toFixed(0)}K`
											}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "rgba(254, 252, 232, 0.9)",
												border: "1px solid #CA8A04",
											}}
											formatter={(value) => [
												`$${Number(value).toLocaleString()}`,
												"Reserve Value",
											]}
										/>
										<Line
											type="monotone"
											dataKey="value"
											stroke="#CA8A04"
											strokeWidth={2}
											dot={false}
											name="Total Reserve"
										/>
										<Line
											type="monotone"
											dataKey="duduValue"
											stroke="#4CAF50"
											strokeWidth={2}
											dot={false}
											name="DUDU Value"
										/>
										<Line
											type="monotone"
											dataKey="usdtValue"
											stroke="#2196F3"
											strokeWidth={2}
											dot={false}
											name="USDT Value"
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default DashboardPage;
