import { ethers, JsonRpcProvider, Contract, formatUnits } from "ethers";
import { CONTRACTS, SEPOLIA_RPC } from "../config/contracts";

const provider = new JsonRpcProvider(SEPOLIA_RPC);

export const getContracts = () => {
	const dusd = new Contract(
		CONTRACTS.DUSD.address,
		CONTRACTS.DUSD.abi,
		provider,
	);

	const reserves = new Contract(
		CONTRACTS.RESERVES.address,
		CONTRACTS.RESERVES.abi,
		provider,
	);

	const usdt = new Contract(
		CONTRACTS.USDT.address,
		CONTRACTS.USDT.abi,
		provider,
	);

	const dudu = new Contract(
		CONTRACTS.DUDU.address,
		CONTRACTS.DUDU.abi,
		provider,
	);

	return { dusd, reserves, usdt, dudu };
};

export const fetchContractData = async () => {
	try {
		const { dusd, reserves, usdt, dudu } = getContracts();

		const totalSupply = await dusd.totalSupply();
		const usdtReserves = await usdt.balanceOf(CONTRACTS.RESERVES.address);
		const duduReserves = await dudu.balanceOf(CONTRACTS.RESERVES.address);

		return {
			totalSupply: formatUnits(totalSupply, 18),
			usdtReserves: formatUnits(usdtReserves, 18),
			duduReserves: formatUnits(duduReserves, 18),
		};
	} catch (error) {
		console.error("Error fetching contract data:", error);
		return null;
	}
};
