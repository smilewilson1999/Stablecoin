import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
// biome-ignore lint/style/useImportType: <explanation>
import {
  ethers,
  JsonRpcProvider,
  Contract,
  formatUnits,
  Provider,
} from "ethers";
import dusdABI from "../../../abi/dusd-abi.json";
import reservesABI from "../../../abi/dusd-reserves-abi.json";
import duduABI from "../../../abi/duducoin-abi.json";
import governanceABI from "../../../abi/dusd-governance-abi.json";

import { getContracts } from "../../../utils/contracts";

const DUSD_PRICE_DB = path.join(process.cwd(), "db/dusd-price-db.json");
const DUDU_PRICE_DB = path.join(process.cwd(), "db/duducoin-price-db.json");
const RESERVE_VALUE_DB = path.join(process.cwd(), "db/reserve-value-db.json");

interface ContractAddresses {
  RESERVES: string;
  GOVERNANCE: string;
  DUSD: string;
  DUDU: string;
  USDT: string;
}

interface VaultData {
  collateral: string;
  amount: bigint;
}

// Contract addresses
const CONTRACTS: ContractAddresses = {
  RESERVES: "0xb14244d276bF289Fbb6C2f917e74A19849DC912c",
  GOVERNANCE: "0x8eE912731f707EA7d025c99814117Da4b1B28aa9",
  DUSD: "0x55c93f355Cc703A4f1458fAE9497Ed7fD014013B",
  DUDU: "0xACEeB364040A4e50ca0D1b1ca168BdD6c0b436A2",
  USDT: "0x75bA9156F2780139d5056832f4fc3Be7b8ae032D",
};

// Provider setup with Sepolia RPC URLs
const RPC_URLS: string[] = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://rpc2.sepolia.org",
  process.env.INFURA_API_KEY
    ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
    : null,
].filter((url): url is string => url !== null);

async function verifyContract(
  contract: Contract,
  name: string
): Promise<boolean> {
  try {
    const provider = contract.runner as Provider;
    const code = await provider.getCode(contract.getAddress());
    // console.log(`Contract ${name} code:`, code);

    if (code === "0x") {
      throw new Error(
        `${name} contract not deployed at ${contract.getAddress()}`
      );
    }
    return true;
  } catch (error) {
    console.error(`Failed to verify ${name} contract:`, error);
    return false;
  }
}

async function createProvider(): Promise<JsonRpcProvider> {
  for (const url of RPC_URLS) {
    try {
      const provider = new JsonRpcProvider(url, {
        chainId: 11155111,
        name: "sepolia",
      });

      const network = await provider.getNetwork();
      console.log("Connected to network:", {
        chainId: network.chainId,
        name: network.name,
        url,
      });

      return provider;
    } catch (error) {
      console.warn(`Failed to connect to ${url}:`, error);
    }
  }
  throw new Error("Failed to connect to any RPC endpoint");
}

let provider: JsonRpcProvider | null = null;
let reserves: Contract | null = null;
let dusd: Contract | null = null;
let dudu: Contract | null = null;

async function initializeContracts(): Promise<boolean> {
  try {
    if (!provider) {
      provider = await createProvider();
    }

    // console.log("Initializing contracts with addresses:", {
    //   reserves: CONTRACTS.RESERVES,
    //   dusd: CONTRACTS.DUSD,
    //   dudu: CONTRACTS.DUDU,
    // });

    reserves = new Contract(CONTRACTS.RESERVES, reservesABI, provider);
    dusd = new Contract(CONTRACTS.DUSD, dusdABI, provider);
    dudu = new Contract(CONTRACTS.DUDU, duduABI, provider);

    const [reservesValid, dusdValid, duduValid] = await Promise.all([
      verifyContract(reserves, "Reserves"),
      verifyContract(dusd, "DUSD"),
      verifyContract(dudu, "DUDU"),
    ]);

    return reservesValid && dusdValid && duduValid;
  } catch (error) {
    console.error("Failed to initialize contracts:", error);
    return false;
  }
}

async function calculateDUSDPrice(): Promise<number> {
  try {
    const initialized = await initializeContracts();
    if (!initialized || !reserves || !dusd || !dudu) {
      throw new Error("Failed to initialize contracts");
    }

    // Add governance contract
    const governanceContract = new Contract(
      CONTRACTS.GOVERNANCE,
      governanceABI,
      provider
    );

    // Get unstable collateral price directly from governance
    const unstableColPrice = await governanceContract.unstableColPrice();
    const duduPrice = Number(formatUnits(unstableColPrice, 18));
    console.log("Current DUDU Price from contract:", duduPrice);

    let usdtVault: VaultData = { collateral: "", amount: BigInt(0) };
    try {
      usdtVault = await reserves._rsvVault(0);
      console.log("USDT Vault data:", usdtVault);
    } catch (error) {
      console.error("Failed to fetch USDT vault:", error);
    }

    let duduVault: VaultData = { collateral: "", amount: BigInt(0) };
    try {
      duduVault = await reserves._rsvVault(1);
      console.log("DUDU Vault data:", duduVault);
    } catch (error) {
      console.error("Failed to fetch DUDU vault:", error);
    }

    let dusdSupply: bigint = BigInt(0);
    try {
      dusdSupply = await dusd.totalSupply();
      console.log("DUSD Supply:", dusdSupply);
    } catch (error) {
      console.error("Failed to fetch DUSD supply:", error);
      dusdSupply = BigInt(1000000) * BigInt(10) ** BigInt(18);
    }

    const usdtAmount = Number(formatUnits(usdtVault.amount, 18));
    const duduAmount = Number(formatUnits(duduVault.amount, 18));
    const totalSupply = Number(formatUnits(dusdSupply, 18));

    console.log("Calculated amounts:", {
      usdtAmount,
      duduAmount,
      totalSupply,
      duduPrice,
    });

    const totalCollateralValue = usdtAmount * 1 + duduAmount * duduPrice;
    const price = totalCollateralValue / totalSupply || 1.0;

    console.log("Calculated price:", price);
    return price;
  } catch (error) {
    console.error("Error calculating DUSD price:", error);
    return 1.0;
  }
}

async function calculateReserveValue() {
  try {
    // Get contracts
    const provider = await createProvider();
    const governance = new Contract(
      CONTRACTS.GOVERNANCE,
      governanceABI,
      provider
    );

    const { reserves, usdt, dudu } = getContracts();

    // Get reserve balances
    const usdtBalance = await usdt.balanceOf(CONTRACTS.RESERVES);
    const duduBalance = await dudu.balanceOf(CONTRACTS.RESERVES);

    // Get current DUDU price from governance contract
    const unstableColPrice = await governance.unstableColPrice();
    const duduPrice = Number(formatUnits(unstableColPrice, 18));

    const usdtValue = Number(formatUnits(usdtBalance, 18));
    const duduValue = Number(formatUnits(duduBalance, 18)) * duduPrice;
    const totalValue = usdtValue + duduValue;

    return {
      timestamp: new Date().toISOString(),
      usdtBalance: usdtValue,
      duduBalance: Number(formatUnits(duduBalance, 18)),
      duduPrice: duduPrice,
      totalValue: totalValue,
    };
  } catch (error) {
    console.error("Error calculating reserve value:", error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "DUSD";
  const filePath = token === "DUSD" ? DUSD_PRICE_DB : DUDU_PRICE_DB;

  try {
    // Ensure db directory exists
    const dbDir = path.join(process.cwd(), "db");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Read price history or return empty array if file doesn't exist
    let prices = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      prices = JSON.parse(data);
    }

    return NextResponse.json(prices);
  } catch (error) {
    console.error(`Error reading ${token} price history:`, error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    // Calculate current price
    const currentPrice = await calculateDUSDPrice();

    // Calculate reserve value
    const reserveValue = await calculateReserveValue();

    // Ensure db directory exists
    const dbDir = path.join(process.cwd(), "db");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Read existing history
    let history = [];
    try {
      if (fs.existsSync(DUSD_PRICE_DB)) {
        const data = fs.readFileSync(DUSD_PRICE_DB, "utf8");
        history = JSON.parse(data);
      }
    } catch (error) {
      console.warn("No existing price history found, starting new history");
    }

    // Add new price point
    const newDataPoint = {
      timestamp: new Date().toISOString(),
      price: currentPrice,
    };

    history.push(newDataPoint);

    // Keep last 1000 points
    const trimmedHistory = history.slice(-1000);

    // write updated DUSD price history
    fs.writeFileSync(DUSD_PRICE_DB, JSON.stringify(trimmedHistory, null, 2));

    // Read existing reserve history
    let reserveHistory = [];
    try {
      if (fs.existsSync(RESERVE_VALUE_DB)) {
        const data = fs.readFileSync(RESERVE_VALUE_DB, "utf8");
        reserveHistory = JSON.parse(data);
        console.log("API reading reserve history:", reserveHistory);
      }
    } catch (error) {
      console.warn("No existing reserve history found, starting new history");
    }

    // Add new reserve value
    if (reserveValue) {
      reserveHistory.push({
        timestamp: new Date().toISOString(),
        ...reserveValue,
      });
    }

    // Keep last 1000 points
    const trimmedReserveHistory = reserveHistory.slice(-1000);

    // write updated reserve value history
    fs.writeFileSync(
      RESERVE_VALUE_DB,
      JSON.stringify(trimmedReserveHistory, null, 2)
    );

    return NextResponse.json({
      success: true,
      currentPrice,
      reserveValue,
      priceHistory: trimmedHistory,
      reserveHistory: trimmedReserveHistory,
    });
  } catch (error) {
    console.error("Error updating price data:", error);
    return NextResponse.json({
      success: true,
      currentPrice: 1.0,
      data: [
        {
          timestamp: new Date().toISOString(),
          price: 1.0,
        },
      ],
    });
  }
}
