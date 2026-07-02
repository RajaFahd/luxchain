// ============================================================
// Luxchain NFT — Deploy Script (Remix IDE + ethers.js)
// ============================================================
// Usage: Right click → "Run" in Remix IDE (Ctrl+Shift+S)
// Make sure to compile LuxchainNFT.sol first!
// ============================================================

import { deploy } from './ethers-lib'

(async () => {
    try {
        console.log('🚀 Deploying LuxchainNFT contract...')
        console.log('─'.repeat(50))

        const result = await deploy('LuxchainNFT', [])

        console.log('✅ LuxchainNFT deployed successfully!')
        console.log(`📍 Contract Address: ${result.address}`)
        console.log('─'.repeat(50))
        console.log('')
        console.log('📋 Next steps:')
        console.log('   1. Copy the contract address above')
        console.log('   2. Save it in your .env file as CONTRACT_ADDRESS')
        console.log('   3. Use Remix IDE to interact with the contract')
        console.log('   4. Add admin wallets via addAdmin()')
        console.log('')
        console.log('🔗 Contract Functions:')
        console.log('   • mintToBlockchain(uuid, metadataHash) — Mint produk baru')
        console.log('   • verifyProduct(tokenId)               — Verifikasi produk')
        console.log('   • transferProduct(tokenId, to)          — Transfer kepemilikan')
        console.log('   • claimProduct(tokenId)                 — Klaim produk')
        console.log('   • getProductByUUID(uuid)                — Cari produk by UUID')
        console.log('   • getOwnershipHistory(tokenId)          — Riwayat kepemilikan')
    } catch (e) {
        console.error('❌ Deployment failed:', e.message)
    }
})()
