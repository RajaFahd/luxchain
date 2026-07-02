// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    LUXCHAIN NFT CONTRACT                     ║
 * ║      Hybrid Blockchain Luxury Fashion Verification           ║
 * ║                                                              ║
 * ║  Setiap produk fashion mewah di-mint sebagai NFT unik.       ║
 * ║  Hash SHA-256 dari metadata disimpan on-chain sebagai        ║
 * ║  immutable proof-of-authenticity.                            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * @title LuxchainNFT
 * @author Luxchain Team
 * @notice ERC-721 contract for luxury fashion product verification
 * @dev Implements minting, verification, transfer, and ownership history
 *
 * Architecture:
 *   - Off-chain: MySQL stores full metadata, QR codes, product images
 *   - On-chain:  This contract stores UUID + SHA-256 hash as proof
 *   - Verification: Compare on-chain hash with recomputed hash from off-chain data
 */

// ============================================================
// INLINE ERC-721 IMPLEMENTATION (Remix IDE compatible)
// ============================================================
// Since this is a Remix IDE project, we implement ERC-721
// interfaces inline to avoid complex import resolution issues.
// ============================================================

/**
 * @dev ERC-165 interface for contract introspection
 */
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/**
 * @dev ERC-721 standard interface
 */
interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @dev Interface for ERC-721 token receiver
 */
interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

// ============================================================
// MAIN CONTRACT
// ============================================================

contract LuxchainNFT is IERC721 {

    // ─────────────────────────────────────────────────────────
    //  Contract Metadata
    // ─────────────────────────────────────────────────────────

    string public constant name = "Luxchain Fashion NFT";
    string public constant symbol = "LUXC";

    // ─────────────────────────────────────────────────────────
    //  Structs
    // ─────────────────────────────────────────────────────────

    /// @notice On-chain record for each minted product
    struct ProductRecord {
        string uuid;            // UUID v4 dari ProductItem (generated off-chain)
        string metadataHash;    // SHA-256 hash dari metadata produk
        address mintedBy;       // Admin address yang melakukan minting
        uint256 mintedAt;       // Block timestamp saat minting
        bool exists;            // Flag untuk cek eksistensi
    }

    /// @notice Ownership history entry
    struct OwnershipRecord {
        address owner;          // Address pemilik
        uint256 timestamp;      // Block timestamp saat transfer/klaim
        string transferType;    // "mint", "claim", "transfer"
    }

    // ─────────────────────────────────────────────────────────
    //  State Variables
    // ─────────────────────────────────────────────────────────

    // Admin management
    address public contractOwner;
    mapping(address => bool) public admins;
    address[] private adminList;

    // Token counter (auto-increment token ID)
    uint256 private _tokenIdCounter;

    // ERC-721 core storage
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Luxchain product storage
    mapping(uint256 => ProductRecord) private _products;           // tokenId → ProductRecord
    mapping(string => uint256) private _uuidToTokenId;              // UUID → tokenId
    mapping(string => bool) private _uuidExists;                    // UUID → exists (for dedup)
    mapping(uint256 => OwnershipRecord[]) private _ownershipHistory; // tokenId → history[]

    // ─────────────────────────────────────────────────────────
    //  Events (Luxchain-specific)
    // ─────────────────────────────────────────────────────────

    /// @notice Emitted when a new product is minted to blockchain
    event ProductMinted(
        uint256 indexed tokenId,
        string uuid,
        string metadataHash,
        address indexed mintedBy,
        uint256 timestamp
    );

    /// @notice Emitted when product ownership is transferred
    event OwnershipTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string transferType,
        uint256 timestamp
    );

    /// @notice Emitted when a product is verified
    event ProductVerified(
        uint256 indexed tokenId,
        string uuid,
        address verifiedBy,
        uint256 timestamp
    );

    /// @notice Emitted when an admin is added or removed
    event AdminUpdated(
        address indexed admin,
        bool isAdmin,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────────────

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "LuxchainNFT: caller is not contract owner");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "LuxchainNFT: caller is not admin");
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        require(_owners[tokenId] != address(0), "LuxchainNFT: token does not exist");
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Deploy contract — deployer becomes contract owner & first admin
     */
    constructor() {
        contractOwner = msg.sender;
        admins[msg.sender] = true;
        adminList.push(msg.sender);
        _tokenIdCounter = 0;

        emit AdminUpdated(msg.sender, true, block.timestamp);
    }

    // ═════════════════════════════════════════════════════════
    //  ADMIN MANAGEMENT
    // ═════════════════════════════════════════════════════════

    /**
     * @notice Add a new admin wallet address
     * @param _admin Address to grant admin role
     */
    function addAdmin(address _admin) external onlyContractOwner {
        require(_admin != address(0), "LuxchainNFT: zero address");
        require(!admins[_admin], "LuxchainNFT: already admin");

        admins[_admin] = true;
        adminList.push(_admin);

        emit AdminUpdated(_admin, true, block.timestamp);
    }

    /**
     * @notice Remove an admin wallet address
     * @param _admin Address to revoke admin role
     */
    function removeAdmin(address _admin) external onlyContractOwner {
        require(_admin != contractOwner, "LuxchainNFT: cannot remove contract owner");
        require(admins[_admin], "LuxchainNFT: not an admin");

        admins[_admin] = false;

        // Remove from adminList array
        for (uint256 i = 0; i < adminList.length; i++) {
            if (adminList[i] == _admin) {
                adminList[i] = adminList[adminList.length - 1];
                adminList.pop();
                break;
            }
        }

        emit AdminUpdated(_admin, false, block.timestamp);
    }

    /**
     * @notice Get list of all admin addresses
     * @return Array of admin wallet addresses
     */
    function getAdmins() external view returns (address[] memory) {
        return adminList;
    }

    /**
     * @notice Check if an address is admin
     * @param _addr Address to check
     * @return True if address is admin
     */
    function isAdmin(address _addr) external view returns (bool) {
        return admins[_addr];
    }

    // ═════════════════════════════════════════════════════════
    //  CORE LUXCHAIN FUNCTIONS
    // ═════════════════════════════════════════════════════════

    /**
     * @notice Mint a new product NFT to blockchain (admin only)
     * @dev Called by API server after admin signs via MetaMask
     *      Flow: Admin Form → API generates UUID + SHA-256 hash → MetaMask sign → this function
     *
     * @param _uuid        UUID v4 dari ProductItem (generated off-chain)
     * @param _metadataHash SHA-256 hash dari metadata produk (nama+brand+SKU+warna+material+tahun+UUID)
     * @return tokenId     Auto-incremented token ID yang di-assign ke NFT
     */
    function mintToBlockchain(
        string calldata _uuid,
        string calldata _metadataHash
    ) external onlyAdmin returns (uint256) {
        // Validate inputs
        require(bytes(_uuid).length > 0, "LuxchainNFT: UUID cannot be empty");
        require(bytes(_metadataHash).length > 0, "LuxchainNFT: hash cannot be empty");
        require(!_uuidExists[_uuid], "LuxchainNFT: UUID already minted");

        // Increment token ID counter
        uint256 newTokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // Mint ERC-721 token to admin (msg.sender)
        _mint(msg.sender, newTokenId);

        // Store product record on-chain
        _products[newTokenId] = ProductRecord({
            uuid: _uuid,
            metadataHash: _metadataHash,
            mintedBy: msg.sender,
            mintedAt: block.timestamp,
            exists: true
        });

        // Map UUID → tokenId for lookup
        _uuidToTokenId[_uuid] = newTokenId;
        _uuidExists[_uuid] = true;

        // Record initial ownership in history
        _ownershipHistory[newTokenId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            transferType: "mint"
        }));

        emit ProductMinted(newTokenId, _uuid, _metadataHash, msg.sender, block.timestamp);

        return newTokenId;
    }

    /**
     * @notice Verify a product's authenticity by comparing on-chain hash
     * @dev Read-only function called during QR scan verification flow
     *      The API server recomputes the hash from MySQL metadata and compares
     *
     * @param _tokenId Token ID to verify
     * @return uuid         UUID of the product
     * @return metadataHash SHA-256 hash stored on-chain
     * @return currentOwner Current owner address of the NFT
     * @return mintedBy     Admin who originally minted this product
     * @return mintedAt     Timestamp when the product was minted
     */
    function verifyProduct(uint256 _tokenId)
        external
        view
        tokenExists(_tokenId)
        returns (
            string memory uuid,
            string memory metadataHash,
            address currentOwner,
            address mintedBy,
            uint256 mintedAt
        )
    {
        ProductRecord storage product = _products[_tokenId];

        return (
            product.uuid,
            product.metadataHash,
            _owners[_tokenId],
            product.mintedBy,
            product.mintedAt
        );
    }

    /**
     * @notice Transfer product ownership to a new address
     * @dev Called when consumer transfers NFT (preloved/resale)
     *      Consumer signs via MetaMask → Smart Contract executes transfer
     *
     * @param _tokenId Token ID to transfer
     * @param _to      New owner address
     * @return success  True if transfer succeeded
     */
    function transferProduct(uint256 _tokenId, address _to)
        external
        tokenExists(_tokenId)
        returns (bool)
    {
        address currentOwner = _owners[_tokenId];
        require(
            msg.sender == currentOwner ||
            admins[msg.sender] ||
            _tokenApprovals[_tokenId] == msg.sender ||
            _operatorApprovals[currentOwner][msg.sender],
            "LuxchainNFT: not authorized to transfer"
        );
        require(_to != address(0), "LuxchainNFT: transfer to zero address");
        require(_to != currentOwner, "LuxchainNFT: transfer to current owner");

        // Execute ERC-721 transfer
        _transfer(currentOwner, _to, _tokenId);

        // Record in ownership history
        _ownershipHistory[_tokenId].push(OwnershipRecord({
            owner: _to,
            timestamp: block.timestamp,
            transferType: "transfer"
        }));

        emit OwnershipTransferred(
            _tokenId,
            currentOwner,
            _to,
            "transfer",
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Claim ownership of a product (first buyer claiming from admin/brand)
     * @dev Called when consumer scans QR and claims the product
     *      Different from transfer — this is the initial claim from brand to consumer
     *
     * @param _tokenId Token ID to claim
     * @return success  True if claim succeeded
     */
    function claimProduct(uint256 _tokenId)
        external
        tokenExists(_tokenId)
        returns (bool)
    {
        address currentOwner = _owners[_tokenId];

        // Only admin (brand) can have products claimed from them
        require(admins[currentOwner], "LuxchainNFT: product already claimed by consumer");

        // Execute ERC-721 transfer to claimer
        _transfer(currentOwner, msg.sender, _tokenId);

        // Record in ownership history
        _ownershipHistory[_tokenId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            transferType: "claim"
        }));

        emit OwnershipTransferred(
            _tokenId,
            currentOwner,
            msg.sender,
            "claim",
            block.timestamp
        );

        return true;
    }

    // ═════════════════════════════════════════════════════════
    //  QUERY / READ FUNCTIONS
    // ═════════════════════════════════════════════════════════

    /**
     * @notice Get full ownership history for a token
     * @param _tokenId Token ID to query
     * @return Array of OwnershipRecord (owner, timestamp, type)
     */
    function getOwnershipHistory(uint256 _tokenId)
        external
        view
        tokenExists(_tokenId)
        returns (OwnershipRecord[] memory)
    {
        return _ownershipHistory[_tokenId];
    }

    /**
     * @notice Get product details by UUID (used in QR verification flow)
     * @param _uuid Product UUID
     * @return tokenId      Token ID
     * @return metadataHash SHA-256 hash
     * @return currentOwner Current owner address
     * @return mintedBy     Admin minter address
     * @return mintedAt     Mint timestamp
     */
    function getProductByUUID(string calldata _uuid)
        external
        view
        returns (
            uint256 tokenId,
            string memory metadataHash,
            address currentOwner,
            address mintedBy,
            uint256 mintedAt
        )
    {
        require(_uuidExists[_uuid], "LuxchainNFT: product not found");
        uint256 _tokenId = _uuidToTokenId[_uuid];
        ProductRecord storage product = _products[_tokenId];

        return (
            _tokenId,
            product.metadataHash,
            _owners[_tokenId],
            product.mintedBy,
            product.mintedAt
        );
    }

    /**
     * @notice Get product record by token ID
    * @param _tokenId Token ID
    * @return uuid Product UUID
    * @return metadataHash SHA-256 hash of the product metadata
    * @return currentOwner Current owner address
    * @return mintedBy Admin address that minted the product
    * @return mintedAt Timestamp when the product was minted
    */
    function getProduct(uint256 _tokenId)
        external
        view
        tokenExists(_tokenId)
        returns (
            string memory uuid,
            string memory metadataHash,
            address currentOwner,
            address mintedBy,
            uint256 mintedAt
        )
    {
        ProductRecord storage product = _products[_tokenId];
        return (
            product.uuid,
            product.metadataHash,
            _owners[_tokenId],
            product.mintedBy,
            product.mintedAt
        );
    }

    /**
     * @notice Get total number of minted products
     * @return Total token count
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Get the number of transfers for a specific token
     * @param _tokenId Token ID
     * @return Number of ownership changes
     */
    function getTransferCount(uint256 _tokenId)
        external
        view
        tokenExists(_tokenId)
        returns (uint256)
    {
        return _ownershipHistory[_tokenId].length;
    }

    // ═════════════════════════════════════════════════════════
    //  ERC-721 STANDARD IMPLEMENTATION
    // ═════════════════════════════════════════════════════════

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    /// @inheritdoc IERC721
    function balanceOf(address owner) external view override returns (uint256) {
        require(owner != address(0), "ERC721: zero address");
        return _balances[owner];
    }

    /// @inheritdoc IERC721
    function ownerOf(uint256 tokenId) external view override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: nonexistent token");
        return owner;
    }

    /// @inheritdoc IERC721
    function approve(address to, uint256 tokenId) external override {
        address owner = _owners[tokenId];
        require(to != owner, "ERC721: approval to current owner");
        require(
            msg.sender == owner || _operatorApprovals[owner][msg.sender],
            "ERC721: not authorized"
        );
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    /// @inheritdoc IERC721
    function getApproved(uint256 tokenId) external view override returns (address) {
        require(_owners[tokenId] != address(0), "ERC721: nonexistent token");
        return _tokenApprovals[tokenId];
    }

    /// @inheritdoc IERC721
    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != msg.sender, "ERC721: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /// @inheritdoc IERC721
    function isApprovedForAll(address owner, address operator) external view override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    /// @inheritdoc IERC721
    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(
            msg.sender == from ||
            _tokenApprovals[tokenId] == msg.sender ||
            _operatorApprovals[from][msg.sender],
            "ERC721: not authorized"
        );
        _transfer(from, to, tokenId);

        // Also record in Luxchain ownership history
        _ownershipHistory[tokenId].push(OwnershipRecord({
            owner: to,
            timestamp: block.timestamp,
            transferType: "transfer"
        }));

        emit OwnershipTransferred(tokenId, from, to, "transfer", block.timestamp);
    }

    /// @inheritdoc IERC721
    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        transferFrom(from, to, tokenId);
        require(
            _checkOnERC721Received(from, to, tokenId, ""),
            "ERC721: transfer to non-receiver"
        );
    }

    /// @inheritdoc IERC721
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external override {
        transferFrom(from, to, tokenId);
        require(
            _checkOnERC721Received(from, to, tokenId, data),
            "ERC721: transfer to non-receiver"
        );
    }

    // ─────────────────────────────────────────────────────────
    //  Internal ERC-721 Helper Functions
    // ─────────────────────────────────────────────────────────

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "ERC721: mint to zero address");
        require(_owners[tokenId] == address(0), "ERC721: token already minted");

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(_owners[tokenId] == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to zero address");

        // Clear approval
        delete _tokenApprovals[tokenId];

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non-receiver");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
        return true;
    }
}
