// ============================================================
// Blockchain Configuration — Ethers.js Provider + Contract
// ============================================================

const { ethers } = require('ethers');
require('dotenv').config();

// LuxchainNFT contract ABI (only the functions we need)
const CONTRACT_ABI = [
  // Admin management
  "function addAdmin(address _admin) external",
  "function removeAdmin(address _admin) external",
  "function getAdmins() external view returns (address[])",
  "function isAdmin(address _addr) external view returns (bool)",
  "function contractOwner() external view returns (address)",
  "function admins(address) external view returns (bool)",

  // Core Luxchain functions
  "function mintToBlockchain(string calldata _uuid, string calldata _metadataHash) external returns (uint256)",
  "function verifyProduct(uint256 _tokenId) external view returns (string uuid, string metadataHash, address currentOwner, address mintedBy, uint256 mintedAt)",
  "function transferProduct(uint256 _tokenId, address _to) external returns (bool)",
  "function claimProduct(uint256 _tokenId) external returns (bool)",

  // Query functions
  "function getProductByUUID(string calldata _uuid) external view returns (uint256 tokenId, string metadataHash, address currentOwner, address mintedBy, uint256 mintedAt)",
  "function getProduct(uint256 _tokenId) external view returns (string uuid, string metadataHash, address currentOwner, address mintedBy, uint256 mintedAt)",
  "function getOwnershipHistory(uint256 _tokenId) external view returns (tuple(address owner, uint256 timestamp, string transferType)[])",
  "function getTransferCount(uint256 _tokenId) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",

  // ERC-721 standard
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",

  // Events
  "event ProductMinted(uint256 indexed tokenId, string uuid, string metadataHash, address indexed mintedBy, uint256 timestamp)",
  "event OwnershipTransferred(uint256 indexed tokenId, address indexed from, address indexed to, string transferType, uint256 timestamp)",
  "event AdminUpdated(address indexed admin, bool isAdmin, uint256 timestamp)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

let provider = null;
let contract = null;
let wallet = null;

/**
 * Initialize blockchain provider and contract instance
 */
function initBlockchain() {
  try {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const privateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!rpcUrl || !contractAddress) {
      console.warn('⚠️  Blockchain config incomplete — running in offline mode');
      return false;
    }

    provider = new ethers.JsonRpcProvider(rpcUrl);

    // Read-only contract (no private key needed)
    contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

    // If private key is provided, create a signer for write operations
    if (privateKey) {
      wallet = new ethers.Wallet(privateKey, provider);
      contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
      console.log('✅ Blockchain connected (read + write mode)');
    } else {
      console.log('✅ Blockchain connected (read-only mode)');
    }

    return true;
  } catch (error) {
    console.error('❌ Blockchain init failed:', error.message);
    return false;
  }
}

/**
 * Get contract instance (read-only or with signer)
 */
function getContract() {
  return contract;
}

/**
 * Get provider instance
 */
function getProvider() {
  return provider;
}

/**
 * Get wallet instance
 */
function getWallet() {
  return wallet;
}

/**
 * Check if blockchain is connected
 */
function isBlockchainConnected() {
  return contract !== null;
}

module.exports = {
  CONTRACT_ABI,
  initBlockchain,
  getContract,
  getProvider,
  getWallet,
  isBlockchainConnected,
};
