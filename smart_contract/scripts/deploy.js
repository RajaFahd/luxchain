import hre from "hardhat";

async function main() {
  console.log("Memulai proses deploy LuxchainNFT...");
  
  // Ambil data deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploy menggunakan account:", deployer.address);
  
  // Ambil saldo
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Saldo akun:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Saldo 0! Pastikan sudah klaim Sepolia Faucet.");
  }

  // Deploy kontrak
  const LuxchainNFT = await hre.ethers.getContractFactory("LuxchainNFT");
  const luxchainNFT = await LuxchainNFT.deploy();

  await luxchainNFT.waitForDeployment();
  const address = await luxchainNFT.getAddress();

  console.log("\n========================================================");
  console.log("✅ DEPLOY BERHASIL!");
  console.log("📜 Contract Address:", address);
  console.log("========================================================\n");
  
  console.log("Langkah selanjutnya:");
  console.log("1. Copy Contract Address di atas");
  console.log("2. Buka folder api_server");
  console.log("3. Buka file .env di dalam api_server");
  console.log("4. Paste ke SMART_CONTRACT_ADDRESS=" + address);
  console.log("5. Restart api_server kamu!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
