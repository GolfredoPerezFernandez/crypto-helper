// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RentalNFT.sol";

/**
 * SaleMarket
 * - Venta a precio fijo con escrow del NFT.
 * - Respeta exclusividad (usa nft.marketSetMode) y pausa global (nft.paused()).
 * - Requiere estar autorizado por el NFT (isAuthorizedMarket).
 */

contract SaleMarket is ReentrancyGuard, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;

    RentalNFT public immutable nft;
    IERC20   public immutable paymentToken;

    constructor(address admin, address nftAddress, address erc20) Ownable(admin) {
        nft = RentalNFT(nftAddress);
        paymentToken = IERC20(erc20);
    }

    struct SaleListing {
        address seller;
        uint256 price;
        bool    isActive;
    }

    mapping(uint256 => SaleListing) public saleListings; // Cambiado a public para visibilidad
    uint256[] private activeSaleListings;
    mapping(uint256 => uint256) private activeSaleIndex;
    mapping(address => EnumerableSet.UintSet) private _saleByUser;

    event NFTListedForSale(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTSaleCancelled(uint256 indexed tokenId);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);

    // -------- Listar (bloqueado en pausa) --------
    function listNFTForSale(uint256 tokenId, uint256 price) external {
        require(!nft.paused(), "Paused");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");
        require(nft.mode(tokenId) == RentalNFT.ListingMode.None, "Exclusive");
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "price=0");
        require(!saleListings[tokenId].isActive, "Already listed");

        // Escrow del NFT (debe existir approval previo)
        nft.transferFrom(msg.sender, address(this), tokenId);

        saleListings[tokenId] = SaleListing({ seller: msg.sender, price: price, isActive: true });
        activeSaleIndex[tokenId] = activeSaleListings.length;
        activeSaleListings.push(tokenId);

        nft.marketSetMode(tokenId, RentalNFT.ListingMode.Sale);
        _saleByUser[msg.sender].add(tokenId);

        emit NFTListedForSale(tokenId, msg.sender, price);
    }

    // -------- Cancelar (permitido en pausa) --------
    function cancelNFTSale(uint256 tokenId) external {
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");

        SaleListing storage l = saleListings[tokenId];
        require(l.isActive, "Not listed");
        require(l.seller == msg.sender, "Not seller");

        l.isActive = false;
        _removeActive(tokenId);
        nft.marketSetMode(tokenId, RentalNFT.ListingMode.None);

        nft.transferFrom(address(this), l.seller, tokenId);
        _saleByUser[msg.sender].remove(tokenId);

        emit NFTSaleCancelled(tokenId);
    }

    // -------- Comprar (bloqueado en pausa) --------
    function buyNFT(uint256 tokenId) external nonReentrant {
        require(!nft.paused(), "Paused");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");

        SaleListing storage l = saleListings[tokenId];
        require(l.isActive, "Not listed");
        require(l.seller != msg.sender, "Self-buy");

        // Effects (CEI)
        l.isActive = false;
        _removeActive(tokenId);
        nft.marketSetMode(tokenId, RentalNFT.ListingMode.None);
        _saleByUser[l.seller].remove(tokenId);

        // Interactions
        require(paymentToken.allowance(msg.sender, address(this)) >= l.price, "allowance");
        require(paymentToken.transferFrom(msg.sender, l.seller, l.price), "payment");

        nft.transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(tokenId, l.seller, msg.sender, l.price);
    }


    // -------- Getters --------
    /// @notice Devuelve el struct SaleListing aunque nunca haya sido listado (no hace revert)
    function getSaleListing(uint256 tokenId) external view returns (SaleListing memory) {
        return saleListings[tokenId];
    }

    function getActiveSaleIds() external view returns (uint256[] memory) {
        return activeSaleListings;
    }

    function getUserSaleListed(address user) external view returns (uint256[] memory) {
        return _saleByUser[user].values();
    }

    // -------- Internos --------
    function _removeActive(uint256 tokenId) internal {
        uint256 idx = activeSaleIndex[tokenId];
        if (activeSaleListings.length > 0 && idx < activeSaleListings.length && activeSaleListings[idx] == tokenId) {
            uint256 last = activeSaleListings[activeSaleListings.length - 1];
            activeSaleListings[idx] = last;
            activeSaleIndex[last] = idx;
            activeSaleListings.pop();
            delete activeSaleIndex[tokenId];
        }
    }
}
