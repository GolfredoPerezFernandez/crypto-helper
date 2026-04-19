// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "./RentalNFT.sol";

/**
 * RentalMarket
 * - Ofertas con escrow = 1er periodo (se paga al aceptar).
 * - % por renter, capacidad total 100%.
 * - Cobro recurrente por periodo + gracia. Upkeep para cobros/fin.
 * - Respeta pausa global y exclusividad.
 * - Implementa IAccessChecker para dar acceso a metadata privada del NFT.
 */
contract RentalMarket is
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
    struct RentalListing {
        address owner;
        uint256 basePrice; // precio por periodo completo (100%)
        uint256 duration;  // segundos por periodo
        bool isActive;
    }
    mapping(uint256 => RentalListing) public rentalListings;

    struct RentalOffer {
        address renter;
        uint8   percentage;   // 1..100
        uint256 offerTime;
        uint256 amountPaid;   // escrow (primer periodo proporcional)
        bool    accepted;
    }
    mapping(uint256 => RentalOffer[]) private _rentalOffers;

    struct ActiveRental {
        uint256 expiresAt;       // alias de nextDue
        bool    active;
        uint64  nextDue;
        uint64  graceEnd;
        uint32  graceSeconds;
        uint16  missed;
        uint256 pricePerPeriod;  // proporcional al %
        bool    endRequestedByOwner;
        bool    endRequestedByRenter;
        uint8   percentage;
    }
    mapping(uint256 => mapping(address => ActiveRental)) public activeRentals;

    // Índices
    mapping(uint256 => EnumerableSet.AddressSet) private _activeRentersByToken;
    EnumerableSet.UintSet private _activeRentalTokenIds;
    mapping(address => EnumerableSet.UintSet) private _rentalByUser;

    // Contabilidad
    mapping(uint256 => uint256) private _rentalEscrowOutstanding; // escrow total pendiente por token
    mapping(uint256 => uint8)    private _allocatedPct;            // capacidad usada por token (0..100)

    // Parámetros
    uint32  public rentalGraceDefault = 7 days;
    uint256 public maxScanPerUpkeep   = 50;

    // Eventos
    event RentalListed(uint256 indexed tokenId, address indexed owner, uint256 basePrice, uint256 duration);
    event RentalListingCancelled(uint256 indexed tokenId);
    event RentalOfferCreated(uint256 indexed tokenId, address indexed renter, uint8 percentage, uint256 amountPaid);
    event RentalOfferWithdrawn(uint256 indexed tokenId, address indexed renter, uint256 amountRefunded);
    event RentalOfferAccepted(uint256 indexed tokenId, address indexed renter, uint256 nextDue);
    event RentalOfferAcceptedPct(uint256 indexed tokenId, address indexed renter, uint8 percentage, uint256 nextDue);
    event RentalEndRequested(uint256 indexed tokenId, address indexed by, uint64 willEndAt);
    event RentalEnded(uint256 indexed tokenId, address indexed renter);
    event RentalEndedPct(uint256 indexed tokenId, address indexed renter, uint8 percentage);
    event RentalCharged(uint256 indexed tokenId, address indexed renter, uint256 amount, uint64 nextDue);
    event RentalChargeFailed(uint256 indexed tokenId, address indexed renter, string reason, uint64 graceEnd);

    // =========================
    // Admin
    // =========================
    function setRentalGraceDefault(uint32 secs) external onlyOwner {
        require(secs >= 1 hours && secs <= 60 days, "Bad grace");
        rentalGraceDefault = secs;
    }

    function setMaxScanPerUpkeep(uint256 n) external onlyOwner {
        require(n > 0 && n <= 500, "Bad scan");
        maxScanPerUpkeep = n;
    }

    // =========================
    // Listado (bloqueado en pausa)
    // =========================
    function listNFTForRental(uint256 tokenId, uint256 basePrice, uint256 duration) external {
        require(!nft.paused(), "Paused");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");
        require(nft.mode(tokenId) == RentalNFT.ListingMode.None, "Exclusive");
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(basePrice > 0 && duration > 0, "params");

        rentalListings[tokenId] = RentalListing({
            owner: msg.sender,
            basePrice: basePrice,
            duration: duration,
            isActive: true
        });

        nft.marketSetMode(tokenId, RentalNFT.ListingMode.Rental);
        _rentalByUser[msg.sender].add(tokenId);

        emit RentalListed(tokenId, msg.sender, basePrice, duration);
    }

    // Cancelar (permitido en pausa)
    function cancelRentalListing(uint256 tokenId) external {
        RentalListing storage l = rentalListings[tokenId];
        require(l.isActive, "Not listed");
        require(l.owner == msg.sender, "Not owner");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");
        require(_activeRentersByToken[tokenId].length() == 0, "Active renters");
        require(_rentalEscrowOutstanding[tokenId] == 0, "Pending escrow");

        l.isActive = false;
        nft.marketSetMode(tokenId, RentalNFT.ListingMode.None);
        _rentalByUser[msg.sender].remove(tokenId);

        emit RentalListingCancelled(tokenId);
    }

    // =========================
    // Ofertas
    // =========================

    // Crear (bloqueado en pausa)
    function createRentalOffer(uint256 tokenId, uint8 percentage) external nonReentrant {
        require(!nft.paused(), "Paused");
        RentalListing memory l = rentalListings[tokenId];
        require(l.isActive, "Not listed");
        require(percentage > 0 && percentage <= 100, "Invalid %");

        // precio proporcional al %
        uint256 price = (l.basePrice * uint256(percentage)) / 100;

        require(paymentToken.allowance(msg.sender, address(this)) >= price, "allowance");
        require(paymentToken.transferFrom(msg.sender, address(this), price), "escrow");

        _rentalOffers[tokenId].push(RentalOffer({
            renter: msg.sender,
            percentage: percentage,
            offerTime: block.timestamp,
            amountPaid: price,
            accepted: false
        }));

        _rentalEscrowOutstanding[tokenId] += price;

        emit RentalOfferCreated(tokenId, msg.sender, percentage, price);
    }

    // Retirar (permitido en pausa)
    function withdrawRentalOffer(uint256 tokenId, uint256 offerIdx) external nonReentrant {
        require(offerIdx < _rentalOffers[tokenId].length, "idx");
        RentalOffer storage offer = _rentalOffers[tokenId][offerIdx];

        require(!offer.accepted, "Accepted");
        require(offer.renter == msg.sender, "Not offer owner");
        uint256 amount = offer.amountPaid;
        require(amount > 0, "Withdrawn");

        offer.amountPaid = 0;
        _rentalEscrowOutstanding[tokenId] -= amount;
        require(paymentToken.transfer(msg.sender, amount), "refund");

        emit RentalOfferWithdrawn(tokenId, msg.sender, amount);
    }

    // Aceptar (bloqueado en pausa)
    function acceptRentalOffer(uint256 tokenId, uint256 offerIdx) external nonReentrant {
        require(!nft.paused(), "Paused");
        require(nft.isAuthorizedMarket(address(this)), "Market not authorized");

        RentalListing memory l = rentalListings[tokenId];
        require(l.isActive, "Not listed");
        require(l.owner == msg.sender, "Not owner");
        require(nft.ownerOf(tokenId) == msg.sender, "Not current owner");

        require(offerIdx < _rentalOffers[tokenId].length, "idx");
        RentalOffer storage offer = _rentalOffers[tokenId][offerIdx];
        require(!offer.accepted, "Accepted");
        require(offer.amountPaid > 0, "Withdrawn");

        uint8 allocated = _allocatedPct[tokenId];
        require(uint256(allocated) + uint256(offer.percentage) <= 100, "No capacity");

        // Validar que el escrow cubre el primer periodo proporcional
        uint256 pricePerPeriod = (l.basePrice * uint256(offer.percentage)) / 100;
        require(offer.amountPaid == pricePerPeriod, "escrow != first period");

        offer.accepted = true;

        // Inicializar alquiler activo
        ActiveRental storage r = activeRentals[tokenId][offer.renter];
        r.active = true;
        r.pricePerPeriod = pricePerPeriod;
        r.graceSeconds = rentalGraceDefault;
        r.missed = 0;
        r.graceEnd = 0;

        // nextDue = ahora + duración (cast con límites razonables)
        require(l.duration <= type(uint64).max, "duration too big");
        uint64 nextDue_ = uint64(block.timestamp + l.duration);
        r.nextDue   = nextDue_;
        r.expiresAt = nextDue_;
        r.endRequestedByOwner = false;
        r.endRequestedByRenter = false;
        r.percentage = offer.percentage;

        _allocatedPct[tokenId] = allocated + offer.percentage;
        _activeRentalTokenIds.add(tokenId);
        _activeRentersByToken[tokenId].add(offer.renter);

        // Payout al owner del listado
        uint256 payout = offer.amountPaid;
        offer.amountPaid = 0;
        _rentalEscrowOutstanding[tokenId] -= payout;
        require(paymentToken.transfer(msg.sender, payout), "payout");

        emit RentalOfferAccepted(tokenId, offer.renter, r.nextDue);
        emit RentalOfferAcceptedPct(tokenId, offer.renter, offer.percentage, r.nextDue);
    }

    // =========================
    // Fin / Gestión
    // =========================

    function renterRequestEnd(uint256 tokenId) external {
        ActiveRental storage r = activeRentals[tokenId][msg.sender];
        require(r.active, "Not renting");
        r.endRequestedByRenter = true;
        emit RentalEndRequested(tokenId, msg.sender, r.nextDue);
    }

    function ownerRequestEnd(uint256 tokenId, address renter) external {
        RentalListing memory l = rentalListings[tokenId];
        require(l.owner == msg.sender, "Not owner");
        ActiveRental storage r = activeRentals[tokenId][renter];
        require(r.active, "Not renting");
        r.endRequestedByOwner = true;
        emit RentalEndRequested(tokenId, msg.sender, r.nextDue);
    }

    // Fin duro por el renter (exige expiración)
    function endRental(uint256 tokenId) external {
        ActiveRental storage r = activeRentals[tokenId][msg.sender];
        require(r.active, "Not renting");
        require(block.timestamp >= r.expiresAt, "Not expired");
        _closeRental(tokenId, msg.sender);
    }

    // Cobro/fin manual (cualquiera puede llamar)
    function processRental(uint256 tokenId, address renter) public {
        ActiveRental storage r = activeRentals[tokenId][renter];
        if (!r.active) return;
        RentalListing memory l = rentalListings[tokenId];

        // Si alguna de las partes pidió fin y ya es fecha de corte, cerrar
        if ((r.endRequestedByOwner || r.endRequestedByRenter) && block.timestamp >= r.nextDue) {
            _closeRental(tokenId, renter);
            return;
        }

        // Intentar cobro si toca
        if (r.nextDue > 0 && block.timestamp >= r.nextDue) {
            _tryChargeRental(tokenId, renter, l.duration);
            return;
        }

        // Si venció la gracia, cerrar
        if (r.graceEnd > 0 && block.timestamp >= r.graceEnd) {
            _closeRental(tokenId, renter);
            return;
        }
    }

    function processMany(uint256[] calldata tokenIds, address[] calldata renters) external {
        require(tokenIds.length == renters.length, "len mismatch");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            processRental(tokenIds[i], renters[i]);
        }
    }

    // =========================
    // Chainlink Automation
    // =========================
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        uint256 scan = maxScanPerUpkeep;
        uint256 rLen = _activeRentalTokenIds.length();
        uint256 limit = rLen < scan ? rLen : scan;

        for (uint256 i = 0; i < limit; i++) {
            uint256 tokenId = _activeRentalTokenIds.at(i);
            EnumerableSet.AddressSet storage renters = _activeRentersByToken[tokenId];
            uint256 n = renters.length();
            uint256 nLimit = n < scan ? n : scan;

            for (uint256 j = 0; j < nLimit; j++) {
                address renter = renters.at(j);
                ActiveRental memory ar = activeRentals[tokenId][renter];
                if (!ar.active) continue;
                if ((ar.endRequestedByOwner || ar.endRequestedByRenter) && block.timestamp >= ar.nextDue) return (true, "");
                if (ar.nextDue > 0 && block.timestamp >= ar.nextDue) return (true, "");
                if (ar.graceEnd > 0 && block.timestamp >= ar.graceEnd) return (true, "");
            }
        }
        return (false, "");
    }

    function performUpkeep(bytes calldata) external override {
        uint256 processed = 0;
        uint256 scan = maxScanPerUpkeep;

        uint256 i = 0;
        while (i < _activeRentalTokenIds.length() && processed < scan) {
            uint256 tokenId = _activeRentalTokenIds.at(i);
            EnumerableSet.AddressSet storage renters = _activeRentersByToken[tokenId];

            uint256 j = 0;
            while (j < renters.length() && processed < scan) {
                address renter = renters.at(j);
                ActiveRental storage ar = activeRentals[tokenId][renter];
                if (!ar.active) { renters.remove(renter); continue; }

                if ((ar.endRequestedByOwner || ar.endRequestedByRenter) && block.timestamp >= ar.nextDue) {
                    _closeRental(tokenId, renter);
                    processed++;
                    continue;
                }
                if (ar.nextDue > 0 && block.timestamp >= ar.nextDue) {
                    _tryChargeRental(tokenId, renter, rentalListings[tokenId].duration);
                    processed++;
                    continue;
                }
                if (ar.graceEnd > 0 && block.timestamp >= ar.graceEnd) {
                    _closeRental(tokenId, renter);
                    processed++;
                    continue;
                }
                j++;
            }

            if (renters.length() == 0) {
                _activeRentalTokenIds.remove(tokenId);
            } else {
                i++;
            }
        }
    }

    // =========================
    // AccessChecker (NFT privado)
    // =========================
    function hasAccess(uint256 tokenId, address user) external view override returns (bool) {
        ActiveRental memory r = activeRentals[tokenId][user];
        return r.active && block.timestamp < r.expiresAt;
    }

    // =========================
    // Internos
    // =========================
    function _tryChargeRental(uint256 tokenId, address renter, uint256 periodSeconds) internal {
        ActiveRental storage r = activeRentals[tokenId][renter];
        uint256 amount   = r.pricePerPeriod;
        uint256 allowance = paymentToken.allowance(renter, address(this));
        uint256 balance   = paymentToken.balanceOf(renter);

        if (allowance >= amount && balance >= amount) {
            require(paymentToken.transferFrom(renter, rentalListings[tokenId].owner, amount), "transferFrom");

            // Próximo corte
            require(periodSeconds <= type(uint64).max, "duration too big");
            r.nextDue   = uint64(block.timestamp + periodSeconds);
            r.expiresAt = r.nextDue;
            r.graceEnd  = 0;
            r.missed    = 0;

            emit RentalCharged(tokenId, renter, amount, r.nextDue);
        } else {
            if (r.graceEnd == 0) {
                uint64 grace = r.graceSeconds;
                uint256 ge = block.timestamp + grace;
                require(ge <= type(uint64).max, "grace overflow");
                r.graceEnd = uint64(ge);
            }
            unchecked { r.missed += 1; }
            emit RentalChargeFailed(tokenId, renter, "insufficient allowance/balance", r.graceEnd);
        }
    }

    function _closeRental(uint256 tokenId, address renter) internal {
        ActiveRental storage r = activeRentals[tokenId][renter];
        if (!r.active) return;
        r.active = false;

        uint8 pct = r.percentage;
        if (_allocatedPct[tokenId] >= pct) _allocatedPct[tokenId] -= pct;
        else _allocatedPct[tokenId] = 0;

        _activeRentersByToken[tokenId].remove(renter);
        if (_activeRentersByToken[tokenId].length() == 0) {
            _activeRentalTokenIds.remove(tokenId);
        }

        emit RentalEnded(tokenId, renter);
        emit RentalEndedPct(tokenId, renter, pct);
    }

    // =========================
    // Getters extra para front
    // =========================
    function getActiveRenters(uint256 tokenId) external view returns (address[] memory) {
        return _activeRentersByToken[tokenId].values();
    }

    function getActiveRentalTokenIds() external view returns (uint256[] memory) {
        return _activeRentalTokenIds.values();
    }

    function getUserRentalListed(address user) external view returns (uint256[] memory) {
        return _rentalByUser[user].values();
    }

    function getRentalAllocatedPct(uint256 tokenId) external view returns (uint8) {
        return _allocatedPct[tokenId];
    }

    function getRentalOffers(uint256 tokenId) external view returns (RentalOffer[] memory out) {
        RentalOffer[] storage arr = _rentalOffers[tokenId];
        out = new RentalOffer[](arr.length);
        for (uint256 i = 0; i < arr.length; i++) {
            out[i] = arr[i];
        }
    }
}
