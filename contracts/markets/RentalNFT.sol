// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// Si tu versión de OZ usa security/Pausable.sol, cambia el import de abajo.
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

interface IAccessChecker {
    function hasAccess(uint256 tokenId, address user) external view returns (bool);
}

/**
 * RentalNFT (sin lógica de mercado)
 * - Minteo permissionless (auto-ID) + opción con ID elegido.
 * - Exclusividad por token (None | Sale | Rental | Power), fijada SOLO por contratos-mercado autorizados.
 * - Pausa GLOBAL (owner).
 * - Metadata 100% PRIVADA: tokenURI() solo retorna si un access checker concede acceso.
 * - Índices: getUserOwnedNow, getAllTokenIds, totalSupply.
 *
 * Ajustes clave:
 *  - hasAccess() usa try/catch para ignorar checkers que no implementen IAccessChecker (evita revert).
 *  - setAccessChecker() para gestionar checkers explícitamente.
 *  - setAuthorizedMarket(): solo agrega como checker a mercados que realmente otorgan acceso (Rental/Power).
 *
 * Requiere OpenZeppelin v5 (usa _update, _ownerOf, _requireOwned).
 */
contract RentalNFT is ERC721, Ownable, Pausable {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;

    // -------------------- Exclusividad por token --------------------
    enum ListingMode { None, Sale, Rental, Power }
    mapping(uint256 => ListingMode) public mode;

    // Mercados autorizados y su "clase" (Sale/Rental/Power)
    mapping(address => bool) public isAuthorizedMarket;
    mapping(address => ListingMode) public marketKind;

    event MarketAuthorizationChanged(address indexed market, bool allowed, ListingMode kind);
    event ListingModeChanged(uint256 indexed tokenId, ListingMode oldMode, ListingMode newMode, address indexed market);

    modifier onlyMarket() {
        require(isAuthorizedMarket[msg.sender], "Not an authorized market");
        _;
    }

    // -------------------- Access checkers (metadata privada) --------------------
    EnumerableSet.AddressSet private _accessCheckers;
    event AccessCheckerUpdated(address indexed checker, bool allowed);

    function getAccessCheckers() external view returns (address[] memory) {
        return _accessCheckers.values();
    }

    /// Helper público para frontends: ¿este usuario tiene acceso al token?
    function hasAccess(uint256 tokenId, address user) public view returns (bool) {
        // El owner siempre tiene acceso
        if (_ownerOf(tokenId) == user) return true;

        address[] memory checkers = _accessCheckers.values();
        for (uint256 i = 0; i < checkers.length; i++) {
            // Evita revert si el checker no implementa hasAccess correctamente
            try IAccessChecker(checkers[i]).hasAccess(tokenId, user) returns (bool ok) {
                if (ok) return true;
            } catch {
                // Ignorar checkers incompatibles
            }
        }
        return false;
    }

    // ---- Gestión explícita de checkers ----
    function setAccessChecker(address checker, bool allowed) external onlyOwner {
        if (allowed) {
            if (!_accessCheckers.contains(checker)) {
                _accessCheckers.add(checker);
                emit AccessCheckerUpdated(checker, true);
            }
        } else {
            if (_accessCheckers.contains(checker)) {
                _accessCheckers.remove(checker);
                emit AccessCheckerUpdated(checker, false);
            }
        }
    }

    // ---- Interno: asegurar checker (solo para mercados que dan acceso real) ----
    function _ensureChecker(address market) internal {
        if (!_accessCheckers.contains(market)) {
            _accessCheckers.add(market);
            emit AccessCheckerUpdated(market, true);
        }
    }

    /// Autoriza/revoca un contrato-mercado (solo owner).
    /// Solo agrega como checker si el mercado concede acceso a metadata (Rental y/o Power).
    function setAuthorizedMarket(address market, ListingMode kind, bool allowed) external onlyOwner {
        if (allowed) {
            isAuthorizedMarket[market] = true;
            marketKind[market] = kind;
            // Solo Rental / Power deberían conceder lectura de metadata
            if (kind == ListingMode.Rental || kind == ListingMode.Power) {
                _ensureChecker(market);
            }
        } else {
            isAuthorizedMarket[market] = false;
            delete marketKind[market];
            // No removemos automáticamente de checkers para no romper historiales/lecturas pasadas.
        }
        emit MarketAuthorizationChanged(market, allowed, kind);
    }

    /// Mercados autorizados toman/liberan exclusividad.
    /// - newMode != None: solo si está libre y el "kind" coincide con el market.
    /// - newMode == None: siempre permitido (libera).
    /// Además, si fija modo distinto de None y el market concede acceso, queda registrado como checker.
    function marketSetMode(uint256 tokenId, ListingMode newMode) external onlyMarket {
        ListingMode old = mode[tokenId];
        if (newMode != ListingMode.None) {
            require(old == ListingMode.None, "Already listed");
            require(marketKind[msg.sender] == newMode, "Wrong market kind");
            if (newMode == ListingMode.Rental || newMode == ListingMode.Power) {
                _ensureChecker(msg.sender);
            }
        }
        mode[tokenId] = newMode;
        emit ListingModeChanged(tokenId, old, newMode, msg.sender);
    }

    // -------------------- Índices de propiedad --------------------
    mapping(address => EnumerableSet.UintSet) private _ownedTokens;
    EnumerableSet.UintSet private _allTokens;
    uint256 private _nextId = 1;

    // Hook OZ v5: sincroniza índices en mint/transfer/burn
    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override
        returns (address from)
    {
        from = super._update(to, tokenId, auth);

        // Índice por usuario
        if (from != address(0)) _ownedTokens[from].remove(tokenId);
        if (to != address(0))   _ownedTokens[to].add(tokenId);

        // Índice global
        if (from == address(0)) {
            _allTokens.add(tokenId);        // mint
        }
        if (to == address(0)) {
            _allTokens.remove(tokenId);     // burn
        }
    }

    function getUserOwnedNow(address user) external view returns (uint256[] memory) {
        return _ownedTokens[user].values();
    }

    function getAllTokenIds() external view returns (uint256[] memory) {
        return _allTokens.values();
    }

    function totalSupply() external view returns (uint256) {
        return _allTokens.length();
    }

    // -------------------- Metadata 100% privada --------------------
    mapping(uint256 => string) private _privateTokenURIs;
    event PrivateTokenURISet(uint256 indexed tokenId, string uri);

    /// Define/actualiza la URI privada (solo dueño del token).
    function setPrivateTokenURI(uint256 tokenId, string memory uri) external {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        _privateTokenURIs[tokenId] = uri;
        emit PrivateTokenURISet(tokenId, uri);
    }

    /// ERC721 Metadata: solo retorna si el caller tiene acceso vía checkers (depende de msg.sender).
    /// Si no hay acceso, REVERSA para que no se filtre la metadata.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        // El owner siempre puede leer
        if (_ownerOf(tokenId) == msg.sender) {
            return _privateTokenURIs[tokenId];
        }
        require(hasAccess(tokenId, msg.sender), "No access to metadata");
        return _privateTokenURIs[tokenId];
    }

    /// Alias explícito: mismo comportamiento que tokenURI(tokenId).
    function getPrivateTokenURI(uint256 tokenId) external view returns (string memory) {
        return tokenURI(tokenId);
    }

    // -------------------- NUEVO: lecturas "para un usuario" (no dependen de msg.sender) --------------------
    function tokenURIFor(uint256 tokenId, address user) public view returns (string memory) {
        _requireOwned(tokenId);
        if (_ownerOf(tokenId) == user) {
            return _privateTokenURIs[tokenId];
        }
        require(hasAccess(tokenId, user), "No access to metadata");
        return _privateTokenURIs[tokenId];
    }

    function getPrivateTokenURIFor(uint256 tokenId, address user) external view returns (string memory) {
        return tokenURIFor(tokenId, user);
    }

    // -------------------- Pausable global --------------------
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // -------------------- Constructor --------------------
    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) ERC721(name_, symbol_) Ownable(initialOwner) {}

    // -------------------- Minteo abierto --------------------
    function mint(string memory privateTokenURI_) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _mint(msg.sender, tokenId);
        if (bytes(privateTokenURI_).length != 0) {
            _privateTokenURIs[tokenId] = privateTokenURI_;
            emit PrivateTokenURISet(tokenId, privateTokenURI_);
        }
    }

    function mintWithId(address to, uint256 tokenId, string memory privateTokenURI_) external {
        require(_ownerOf(tokenId) == address(0), "ID taken");
        _mint(to, tokenId);
        if (bytes(privateTokenURI_).length != 0) {
            _privateTokenURIs[tokenId] = privateTokenURI_;
            emit PrivateTokenURISet(tokenId, privateTokenURI_);
        }
        // _nextId no se altera para no romper la secuencia auto.
    }

    // -------------------- Burn --------------------
    function burn(uint256 tokenId) external {
        address owner_ = _ownerOf(tokenId);
        require(
            owner_ == msg.sender ||
            isApprovedForAll(owner_, msg.sender) ||
            getApproved(tokenId) == msg.sender,
            "Not owner nor approved"
        );
        _burn(tokenId);
        delete _privateTokenURIs[tokenId];
        mode[tokenId] = ListingMode.None; // limpia cualquier marca
    }

    // -------------------- Utilidad --------------------
    /// Tokens del usuario que NO están listados (mode == None)
    function getUserUnlistedOwned(address user) external view returns (uint256[] memory out) {
        uint256[] memory all = _ownedTokens[user].values();
        uint256 n = all.length; uint256 count;
        for (uint256 i = 0; i < n; i++) if (mode[all[i]] == ListingMode.None) count++;
        out = new uint256[](count);
        uint256 idx;
        for (uint256 i = 0; i < n; i++) if (mode[all[i]] == ListingMode.None) out[idx++] = all[i];
    }
}
