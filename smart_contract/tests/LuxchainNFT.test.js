// ============================================================
// Luxchain NFT — Test Suite (Remix IDE JavaScript VM)
// ============================================================
// Usage: Right click → "Run" in Remix IDE
// Tests all core functionality: mint, verify, transfer, claim
// ============================================================

import { expect } from "chai";
import hre from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
const { ethers } = hre;

describe("LuxchainNFT", function () {
    let luxchain;
    let owner;
    let admin2;
    let consumer1;
    let consumer2;

    // Sample product data
    const PRODUCT_1 = {
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        hash: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd"
    };
    const PRODUCT_2 = {
        uuid: "550e8400-e29b-41d4-a716-446655440002",
        hash: "b2c3d4e5f678901234567890123456789012345678901234567890123456bcde"
    };
    const PRODUCT_3 = {
        uuid: "550e8400-e29b-41d4-a716-446655440003",
        hash: "c3d4e5f67890123456789012345678901234567890123456789012345678cdef"
    };

    beforeEach(async function () {
        [owner, admin2, consumer1, consumer2] = await ethers.getSigners();

        const LuxchainNFT = await ethers.getContractFactory("LuxchainNFT");
        luxchain = await LuxchainNFT.deploy();
        await luxchain.waitForDeployment();
    });

    // ─────────────────────────────────────────────────
    //  1. DEPLOYMENT & INITIALIZATION
    // ─────────────────────────────────────────────────

    describe("Deployment", function () {
        it("should set deployer as contract owner", async function () {
            expect(await luxchain.contractOwner()).to.equal(owner.address);
        });

        it("should set deployer as first admin", async function () {
            expect(await luxchain.isAdmin(owner.address)).to.be.true;
        });

        it("should have correct name and symbol", async function () {
            expect(await luxchain.name()).to.equal("Luxchain Fashion NFT");
            expect(await luxchain.symbol()).to.equal("LUXC");
        });

        it("should start with 0 total supply", async function () {
            expect(await luxchain.totalSupply()).to.equal(0);
        });
    });

    // ─────────────────────────────────────────────────
    //  2. ADMIN MANAGEMENT
    // ─────────────────────────────────────────────────

    describe("Admin Management", function () {
        it("should allow contract owner to add admin", async function () {
            await luxchain.addAdmin(admin2.address);
            expect(await luxchain.isAdmin(admin2.address)).to.be.true;
        });

        it("should prevent non-owner from adding admin", async function () {
            await expect(
                luxchain.connect(consumer1).addAdmin(admin2.address)
            ).to.be.revertedWith("LuxchainNFT: caller is not contract owner");
        });

        it("should allow contract owner to remove admin", async function () {
            await luxchain.addAdmin(admin2.address);
            await luxchain.removeAdmin(admin2.address);
            expect(await luxchain.isAdmin(admin2.address)).to.be.false;
        });

        it("should prevent removing contract owner as admin", async function () {
            await expect(
                luxchain.removeAdmin(owner.address)
            ).to.be.revertedWith("LuxchainNFT: cannot remove contract owner");
        });

        it("should return correct admin list", async function () {
            await luxchain.addAdmin(admin2.address);
            const admins = await luxchain.getAdmins();
            expect(admins.length).to.equal(2);
            expect(admins).to.include(owner.address);
            expect(admins).to.include(admin2.address);
        });

        it("should prevent adding zero address as admin", async function () {
            await expect(
                luxchain.addAdmin(ethers.ZeroAddress)
            ).to.be.revertedWith("LuxchainNFT: zero address");
        });

        it("should prevent adding duplicate admin", async function () {
            await luxchain.addAdmin(admin2.address);
            await expect(
                luxchain.addAdmin(admin2.address)
            ).to.be.revertedWith("LuxchainNFT: already admin");
        });
    });

    // ─────────────────────────────────────────────────
    //  3. MINTING (mintToBlockchain)
    // ─────────────────────────────────────────────────

    describe("Minting", function () {
        it("should mint a product successfully", async function () {
            const tx = await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
            const receipt = await tx.wait();

            expect(await luxchain.totalSupply()).to.equal(1);
            expect(await luxchain.ownerOf(0)).to.equal(owner.address);
        });

        it("should emit ProductMinted event", async function () {
            await expect(
                luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash)
            ).to.emit(luxchain, "ProductMinted")
              .withArgs(0, PRODUCT_1.uuid, PRODUCT_1.hash, owner.address, anyValue);
        });

        it("should store correct product data on-chain", async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);

            const product = await luxchain.getProduct(0);
            expect(product.uuid).to.equal(PRODUCT_1.uuid);
            expect(product.metadataHash).to.equal(PRODUCT_1.hash);
            expect(product.currentOwner).to.equal(owner.address);
            expect(product.mintedBy).to.equal(owner.address);
        });

        it("should prevent non-admin from minting", async function () {
            await expect(
                luxchain.connect(consumer1).mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash)
            ).to.be.revertedWith("LuxchainNFT: caller is not admin");
        });

        it("should prevent minting with empty UUID", async function () {
            await expect(
                luxchain.mintToBlockchain("", PRODUCT_1.hash)
            ).to.be.revertedWith("LuxchainNFT: UUID cannot be empty");
        });

        it("should prevent minting with empty hash", async function () {
            await expect(
                luxchain.mintToBlockchain(PRODUCT_1.uuid, "")
            ).to.be.revertedWith("LuxchainNFT: hash cannot be empty");
        });

        it("should prevent duplicate UUID minting", async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
            await expect(
                luxchain.mintToBlockchain(PRODUCT_1.uuid, "differenthash")
            ).to.be.revertedWith("LuxchainNFT: UUID already minted");
        });

        it("should mint multiple products with auto-incremented IDs", async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
            await luxchain.mintToBlockchain(PRODUCT_2.uuid, PRODUCT_2.hash);
            await luxchain.mintToBlockchain(PRODUCT_3.uuid, PRODUCT_3.hash);

            expect(await luxchain.totalSupply()).to.equal(3);
            expect(await luxchain.ownerOf(0)).to.equal(owner.address);
            expect(await luxchain.ownerOf(1)).to.equal(owner.address);
            expect(await luxchain.ownerOf(2)).to.equal(owner.address);
        });

        it("should allow different admins to mint", async function () {
            await luxchain.addAdmin(admin2.address);

            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
            await luxchain.connect(admin2).mintToBlockchain(PRODUCT_2.uuid, PRODUCT_2.hash);

            expect(await luxchain.ownerOf(0)).to.equal(owner.address);
            expect(await luxchain.ownerOf(1)).to.equal(admin2.address);
        });
    });

    // ─────────────────────────────────────────────────
    //  4. VERIFICATION (verifyProduct)
    // ─────────────────────────────────────────────────

    describe("Verification", function () {
        beforeEach(async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
        });

        it("should return correct product data for verification", async function () {
            const result = await luxchain.verifyProduct(0);
            expect(result.uuid).to.equal(PRODUCT_1.uuid);
            expect(result.metadataHash).to.equal(PRODUCT_1.hash);
            expect(result.currentOwner).to.equal(owner.address);
            expect(result.mintedBy).to.equal(owner.address);
        });

        it("should revert for non-existent token", async function () {
            await expect(
                luxchain.verifyProduct(999)
            ).to.be.revertedWith("LuxchainNFT: token does not exist");
        });

        it("should be callable by anyone (read-only)", async function () {
            const result = await luxchain.connect(consumer1).verifyProduct(0);
            expect(result.uuid).to.equal(PRODUCT_1.uuid);
        });
    });

    // ─────────────────────────────────────────────────
    //  5. PRODUCT LOOKUP BY UUID
    // ─────────────────────────────────────────────────

    describe("Product Lookup by UUID", function () {
        beforeEach(async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
        });

        it("should find product by UUID", async function () {
            const result = await luxchain.getProductByUUID(PRODUCT_1.uuid);
            expect(result.tokenId).to.equal(0);
            expect(result.metadataHash).to.equal(PRODUCT_1.hash);
            expect(result.currentOwner).to.equal(owner.address);
        });

        it("should revert for non-existent UUID", async function () {
            await expect(
                luxchain.getProductByUUID("non-existent-uuid")
            ).to.be.revertedWith("LuxchainNFT: product not found");
        });
    });

    // ─────────────────────────────────────────────────
    //  6. CLAIM PRODUCT (claimProduct)
    // ─────────────────────────────────────────────────

    describe("Claim Product", function () {
        beforeEach(async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
        });

        it("should allow consumer to claim product from admin", async function () {
            await luxchain.connect(consumer1).claimProduct(0);
            expect(await luxchain.ownerOf(0)).to.equal(consumer1.address);
        });

        it("should emit OwnershipTransferred event on claim", async function () {
            await expect(
                luxchain.connect(consumer1).claimProduct(0)
            ).to.emit(luxchain, "OwnershipTransferred")
              .withArgs(0, owner.address, consumer1.address, "claim", anyValue);
        });

        it("should record claim in ownership history", async function () {
            await luxchain.connect(consumer1).claimProduct(0);
            const history = await luxchain.getOwnershipHistory(0);
            expect(history.length).to.equal(2); // mint + claim
            expect(history[1].owner).to.equal(consumer1.address);
            expect(history[1].transferType).to.equal("claim");
        });

        it("should prevent claiming already-claimed product", async function () {
            await luxchain.connect(consumer1).claimProduct(0);
            await expect(
                luxchain.connect(consumer2).claimProduct(0)
            ).to.be.revertedWith("LuxchainNFT: product already claimed by consumer");
        });

        it("should update balance correctly", async function () {
            await luxchain.connect(consumer1).claimProduct(0);
            expect(await luxchain.balanceOf(consumer1.address)).to.equal(1);
            expect(await luxchain.balanceOf(owner.address)).to.equal(0);
        });
    });

    // ─────────────────────────────────────────────────
    //  7. TRANSFER PRODUCT (transferProduct)
    // ─────────────────────────────────────────────────

    describe("Transfer Product", function () {
        beforeEach(async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
            await luxchain.connect(consumer1).claimProduct(0);
        });

        it("should allow owner to transfer product", async function () {
            await luxchain.connect(consumer1).transferProduct(0, consumer2.address);
            expect(await luxchain.ownerOf(0)).to.equal(consumer2.address);
        });

        it("should emit OwnershipTransferred event", async function () {
            await expect(
                luxchain.connect(consumer1).transferProduct(0, consumer2.address)
            ).to.emit(luxchain, "OwnershipTransferred")
              .withArgs(0, consumer1.address, consumer2.address, "transfer", anyValue);
        });

        it("should record transfer in ownership history", async function () {
            await luxchain.connect(consumer1).transferProduct(0, consumer2.address);
            const history = await luxchain.getOwnershipHistory(0);
            expect(history.length).to.equal(3); // mint + claim + transfer
            expect(history[2].owner).to.equal(consumer2.address);
            expect(history[2].transferType).to.equal("transfer");
        });

        it("should prevent non-owner from transferring", async function () {
            await expect(
                luxchain.connect(consumer2).transferProduct(0, consumer2.address)
            ).to.be.revertedWith("LuxchainNFT: not authorized to transfer");
        });

        it("should prevent transfer to zero address", async function () {
            await expect(
                luxchain.connect(consumer1).transferProduct(0, ethers.ZeroAddress)
            ).to.be.revertedWith("LuxchainNFT: transfer to zero address");
        });

        it("should prevent transfer to self", async function () {
            await expect(
                luxchain.connect(consumer1).transferProduct(0, consumer1.address)
            ).to.be.revertedWith("LuxchainNFT: transfer to current owner");
        });

        it("should allow approved address to transfer", async function () {
            await luxchain.connect(consumer1).approve(consumer2.address, 0);
            await luxchain.connect(consumer2).transferProduct(0, consumer2.address);
            expect(await luxchain.ownerOf(0)).to.equal(consumer2.address);
        });
    });

    // ─────────────────────────────────────────────────
    //  8. OWNERSHIP HISTORY
    // ─────────────────────────────────────────────────

    describe("Ownership History", function () {
        it("should track full lifecycle: mint → claim → transfer", async function () {
            // Mint
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);

            // Claim
            await luxchain.connect(consumer1).claimProduct(0);

            // Transfer
            await luxchain.connect(consumer1).transferProduct(0, consumer2.address);

            const history = await luxchain.getOwnershipHistory(0);
            expect(history.length).to.equal(3);

            expect(history[0].owner).to.equal(owner.address);
            expect(history[0].transferType).to.equal("mint");

            expect(history[1].owner).to.equal(consumer1.address);
            expect(history[1].transferType).to.equal("claim");

            expect(history[2].owner).to.equal(consumer2.address);
            expect(history[2].transferType).to.equal("transfer");
        });

        it("should return correct transfer count", async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
            expect(await luxchain.getTransferCount(0)).to.equal(1); // mint

            await luxchain.connect(consumer1).claimProduct(0);
            expect(await luxchain.getTransferCount(0)).to.equal(2); // mint + claim

            await luxchain.connect(consumer1).transferProduct(0, consumer2.address);
            expect(await luxchain.getTransferCount(0)).to.equal(3); // mint + claim + transfer
        });
    });

    // ─────────────────────────────────────────────────
    //  9. ERC-721 STANDARD COMPLIANCE
    // ─────────────────────────────────────────────────

    describe("ERC-721 Compliance", function () {
        beforeEach(async function () {
            await luxchain.mintToBlockchain(PRODUCT_1.uuid, PRODUCT_1.hash);
        });

        it("should support ERC-721 interface", async function () {
            // ERC-721 interfaceId = 0x80ac58cd
            expect(await luxchain.supportsInterface("0x80ac58cd")).to.be.true;
        });

        it("should support ERC-165 interface", async function () {
            // ERC-165 interfaceId = 0x01ffc9a7
            expect(await luxchain.supportsInterface("0x01ffc9a7")).to.be.true;
        });

        it("should handle standard transferFrom", async function () {
            await luxchain.transferFrom(owner.address, consumer1.address, 0);
            expect(await luxchain.ownerOf(0)).to.equal(consumer1.address);
        });

        it("should handle approval flow", async function () {
            await luxchain.approve(consumer1.address, 0);
            expect(await luxchain.getApproved(0)).to.equal(consumer1.address);

            await luxchain.connect(consumer1).transferFrom(owner.address, consumer1.address, 0);
            expect(await luxchain.ownerOf(0)).to.equal(consumer1.address);
        });

        it("should handle setApprovalForAll", async function () {
            await luxchain.setApprovalForAll(consumer1.address, true);
            expect(await luxchain.isApprovedForAll(owner.address, consumer1.address)).to.be.true;
        });
    });

    // ─────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────

    async function getBlockTimestamp() {
        const block = await ethers.provider.getBlock("latest");
        return block.timestamp;
    }
});
