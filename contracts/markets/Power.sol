// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "./RentalNFT.sol";

/**
 * PowerMarket
 * - Ofertas por % del periodo (basePrice * %).
 * - payUpfront: true paga al aceptar; false liquida al expirar (escrow retenido).
 * - % acumulable por token hasta 100%.
 * - Upkeep para liquidaciones/expiraciones.
 * - Respeta pausa global y exclusividad.
 * - Implementa IAccessChecker para gating de metadata privada.
 */
contract PowerMarket is
    ReentrancyGuard,
    Ownable,
    AutomationCompatibleInterface,
    IAccessChecker
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    RentalNFT public immutable nft;
    IERC20   public immutable paymentToken;

    constructor(address admin, address nftAddress, address erc20) Ownable(admin) {
        nft = RentalNFT(nftAddress);
        paymentToken = IERC20(erc20);
    }

    // =========================
    // Estructuras & Storage
    // =========================
    struct PowerListing {
        address owner;
        uint256 basePrice;   // precio por periodo completo (100%)
        uint256 duration;    // segundos por periodo
        bool isActive;
        bool payUpfront;     // true = paga al aceptar, false = liquida al expirar
    }
    mapping(uint256 => PowerListing) public powerListings;

    struct PowerGrant {
        uint256 expiresAt;   // timestamp de expiración
        uint8   percentage;  // 1..100
        bool    active;
    }
    mapping(uint256 => mapping(address => PowerGrant)) public powerGrants;

    struct PowerOffer {
        address renter;
        uint8   percentage;
        uint256 offerTime;
        uint256 amountPaid;  // escrow = basePrice * %
        bool    accepted;
    }
    mapping(uint256 => PowerOffer[]) private _offers;

    // Índices / contabilidad
    mapping(uint256 => uint8) private _allocatedPct; // 0..100 por token
    mapping(uint256 => EnumerableSet.AddressSet) private _activeRentersByToken;
    EnumerableSet.UintSet private _activePowerTokenIds;

    mapping(uint256 => uint256) private _escrowOutstanding;                   // total escrow retenido por token
    mapping(uint256 => mapping(address => uint256)) private _escrowPerRenter; // escrow por renter (payUpfront=false)

    mapping(address => EnumerableSet.UintSet) private _powerByUser;

    // Parámetros
    uint256 public maxScanPerUpkeep = 50;

    // Eventos
    event PowerListed(uint256 indexed tokenId, address indexed owner, uint256 basePrice, uint256 duration, bool payUpfront);
    event PowerListingCancelled(uint256 indexed tokenId);
    event PowerOfferCreated(uint256 indexed tokenId, address indexed renter, uint8 percentage, uint256 amountPaid);
    event PowerOfferWithdrawn(uint256 indexed tokenId, address indexed renter, uint256 amountRefunded);
    event PowerOfferAccepted(uint256 indexed tokenId, address indexed renter, uint8 percentage, uint256 expiresAt);
    event PowerEnded(uint256 indexed tokenId, address indexed renter, uint8 percentage);

    // =========================
    // Admin
    // =========================
    function setMaxScanPerUpkeep(uint256 n) external onlyOwner {
        require(n > 0 && n <= 500, "Bad scan");
        maxScanPerUpkeep = n;
    }

    // =========================
    // Listado (bloqueado en pausa)
    // =========================
    function listNFTForPower(uint256 tokenId, uint256 basePrice, uint256 duration, bool payUpfront) external {
        require(!nft.paused(), "Paused");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");
        require(nft.mode(tokenId) == RentalNFT.ListingMode.None, "Exclusive");
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(basePrice > 0 && duration > 0, "params");
        require(!powerListings[tokenId].isActive, "Already listed");

        powerListings[tokenId] = PowerListing({
            owner: msg.sender,
            basePrice: basePrice,
            duration: duration,
            isActive: true,
            payUpfront: payUpfront
        });

        nft.marketSetMode(tokenId, RentalNFT.ListingMode.Power);
        _powerByUser[msg.sender].add(tokenId);

        emit PowerListed(tokenId, msg.sender, basePrice, duration, payUpfront);
    }

    // Cancelar (permitido en pausa)
    function cancelPowerListing(uint256 tokenId) external {
        PowerListing storage l = powerListings[tokenId];
        require(l.isActive, "Not listed");
        require(l.owner == msg.sender, "Not owner");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");
        require(_activeRentersByToken[tokenId].length() == 0, "Active users");
        require(_escrowOutstanding[tokenId] == 0, "Pending escrow");

        l.isActive = false;
        nft.marketSetMode(tokenId, RentalNFT.ListingMode.None);
        _powerByUser[msg.sender].remove(tokenId);

        emit PowerListingCancelled(tokenId);
    }

    // =========================
    // Ofertas
    // =========================
    function createPowerOffer(uint256 tokenId, uint8 percentage) external nonReentrant {
        require(!nft.paused(), "Paused");
        PowerListing memory l = powerListings[tokenId];
        require(l.isActive, "Not listed");
        require(percentage > 0 && percentage <= 100, "Invalid %");

        uint256 price = (l.basePrice * uint256(percentage)) / 100;
        require(price > 0, "price=0");
        require(paymentToken.allowance(msg.sender, address(this)) >= price, "allowance");
        require(paymentToken.transferFrom(msg.sender, address(this), price), "escrow");

        _offers[tokenId].push(PowerOffer({
            renter: msg.sender,
            percentage: percentage,
            offerTime: block.timestamp,
            amountPaid: price,
            accepted: false
        }));

        _escrowOutstanding[tokenId] += price;

        emit PowerOfferCreated(tokenId, msg.sender, percentage, price);
    }

    function withdrawPowerOffer(uint256 tokenId, uint256 offerIdx) external nonReentrant {
        require(offerIdx < _offers[tokenId].length, "idx");
        PowerOffer storage o = _offers[tokenId][offerIdx];

        require(!o.accepted, "Accepted");
        require(o.renter == msg.sender, "Not offer owner");
        uint256 amount = o.amountPaid;
        require(amount > 0, "Withdrawn");

        o.amountPaid = 0;
        if (_escrowOutstanding[tokenId] >= amount) {
            _escrowOutstanding[tokenId] -= amount;
        } else {
            _escrowOutstanding[tokenId] = 0;
        }
        require(paymentToken.transfer(msg.sender, amount), "refund");

        emit PowerOfferWithdrawn(tokenId, msg.sender, amount);
    }

    function acceptPowerOffer(uint256 tokenId, uint256 offerIdx) external nonReentrant {
        require(!nft.paused(), "Paused");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");

        PowerListing memory l = powerListings[tokenId];
        require(l.isActive, "Not listed");
        require(l.owner == msg.sender, "Not owner");
        require(nft.ownerOf(tokenId) == msg.sender, "Not current owner");

        require(offerIdx < _offers[tokenId].length, "idx");
        PowerOffer storage o = _offers[tokenId][offerIdx];
        require(!o.accepted, "Accepted");
        require(o.amountPaid > 0, "Withdrawn");

        // Evita grants duplicados para el mismo renter
        PowerGrant storage existing = powerGrants[tokenId][o.renter];
        require(!existing.active, "Already has grant");

        uint8 allocated = _allocatedPct[tokenId];
        require(uint256(allocated) + uint256(o.percentage) <= 100, "No capacity");

        o.accepted = true;

        // Limitar duration a uint64 para evitar overflow de timestamp
        require(l.duration <= type(uint64).max, "duration too big");
        uint64 expiresAt64 = uint64(block.timestamp + l.duration);

        powerGrants[tokenId][o.renter] = PowerGrant({
            expiresAt: uint256(expiresAt64),
            percentage: o.percentage,
            active: true
        });

        _allocatedPct[tokenId] = allocated + o.percentage;
        _activePowerTokenIds.add(tokenId);
        _activeRentersByToken[tokenId].add(o.renter);

        uint256 escrow = o.amountPaid;
        o.amountPaid = 0;

        // Quitar el escrow del "offer"
        if (_escrowOutstanding[tokenId] >= escrow) {
            _escrowOutstanding[tokenId] -= escrow;
        } else {
            _escrowOutstanding[tokenId] = 0;
        }

        if (l.payUpfront) {
            // Se paga al owner ahora
            require(paymentToken.transfer(msg.sender, escrow), "payout");
            // Asegurar cero rastro por renter
            _escrowPerRenter[tokenId][o.renter] = 0;
        } else {
            // Se retiene hasta la expiración del grant
            _escrowOutstanding[tokenId] += escrow;
            _escrowPerRenter[tokenId][o.renter] += escrow;
        }

        emit PowerOfferAccepted(tokenId, o.renter, o.percentage, uint256(expiresAt64));
    }

    // =========================
    // Chainlink Automation
    // =========================
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        uint256 scan = maxScanPerUpkeep;
        uint256 pLen = _activePowerTokenIds.length();
        uint256 limit = pLen < scan ? pLen : scan;

        for (uint256 i = 0; i < limit; i++) {
            uint256 tokenId = _activePowerTokenIds.at(i);
            EnumerableSet.AddressSet storage renters = _activeRentersByToken[tokenId];
            uint256 n = renters.length();
            uint256 nLimit = n < scan ? n : scan;

            for (uint256 j = 0; j < nLimit; j++) {
                address renter = renters.at(j);
                PowerGrant memory pg = powerGrants[tokenId][renter];
                if (pg.active && block.timestamp >= pg.expiresAt) return (true, "");
            }
        }
        return (false, "");
    }

    function performUpkeep(bytes calldata) external override {
        uint256 processed = 0;
        uint256 scan = maxScanPerUpkeep;

        uint256 i = 0;
        while (i < _activePowerTokenIds.length() && processed < scan) {
            uint256 tokenId = _activePowerTokenIds.at(i);
            EnumerableSet.AddressSet storage renters = _activeRentersByToken[tokenId];

            uint256 j = 0;
            while (j < renters.length() && processed < scan) {
                address renter = renters.at(j);
                PowerGrant storage pg = powerGrants[tokenId][renter];

                if (pg.active && block.timestamp >= pg.expiresAt) {
                    pg.active = false;
                    PowerListing memory l = powerListings[tokenId];

                    uint256 due = _escrowPerRenter[tokenId][renter];

                    if (!l.payUpfront) {
                        if (due > 0) {
                            _escrowPerRenter[tokenId][renter] = 0;
                            if (_escrowOutstanding[tokenId] >= due) _escrowOutstanding[tokenId] -= due;
                            else _escrowOutstanding[tokenId] = 0;
                            require(paymentToken.transfer(l.owner, due), "settle");
                        }
                    } else {
                        // Defensivo: por si alguna vez quedó algo cargado
                        if (due > 0) {
                            _escrowPerRenter[tokenId][renter] = 0;
                            // _escrowOutstanding no cambia en payUpfront
                        }
                    }

                    uint8 pct = pg.percentage;
                    if (_allocatedPct[tokenId] >= pct) _allocatedPct[tokenId] -= pct;
                    else _allocatedPct[tokenId] = 0;

                    renters.remove(renter);
                    emit PowerEnded(tokenId, renter, pct);
                    processed++;
                    // tras remove, el índice actual apunta al siguiente
                } else {
                    j++;
                }
            }

            if (renters.length() == 0) {
                _activePowerTokenIds.remove(tokenId);
            } else {
                i++;
            }
        }
    }

    // =========================
    // AccessChecker (NFT privado)
    // =========================
    function hasAccess(uint256 tokenId, address user) external view override returns (bool) {
        PowerGrant memory pg = powerGrants[tokenId][user];
        return pg.active && block.timestamp < pg.expiresAt;
    }

    // Azúcar para el front (mismo criterio que hasAccess)
    function canUsePower(uint256 tokenId, address user) external view returns (bool) {
        PowerGrant memory pg = powerGrants[tokenId][user];
        return pg.active && block.timestamp < pg.expiresAt;
    }

    // =========================
    // Getters extra para front
    // =========================
    function getPowerOffers(uint256 tokenId) external view returns (PowerOffer[] memory out) {
        PowerOffer[] storage arr = _offers[tokenId];
        out = new PowerOffer[](arr.length);
        for (uint256 i = 0; i < arr.length; i++) {
            out[i] = arr[i];
        }
    }

    function getActivePowerRenters(uint256 tokenId) external view returns (address[] memory) {
        return _activeRentersByToken[tokenId].values();
    }

    function getActivePowerTokenIds() external view returns (uint256[] memory) {
        return _activePowerTokenIds.values();
    }

    function getUserPowerListed(address user) external view returns (uint256[] memory) {
        return _powerByUser[user].values();
    }

    function getPowerAllocatedPct(uint256 tokenId) external view returns (uint8) {
        return _allocatedPct[tokenId];
    }
}
