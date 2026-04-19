// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library TransferHelper {
    /// @notice Transfers tokens from the targeted address to the given destination
    /// @notice Errors with 'STF' if transfer fails
    /// @param token The contract address of the token to be transferred
    /// @param from The originating address from which the tokens will be transferred
    /// @param to The destination address of the transfer
    /// @param value The amount to be transferred
    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "STF"
        );
    }

    /// @notice Transfers tokens from msg.sender to a recipient
    /// @dev Errors with ST if transfer fails
    /// @param token The contract address of the token which will be transferred
    /// @param to The recipient of the transfer
    /// @param value The value of the transfer
    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "ST"
        );
    }

    /// @notice Approves the stipulated contract to spend the given allowance in the given token
    /// @dev Errors with 'SA' if transfer fails
    /// @param token The contract address of the token to be approved
    /// @param to The target of the approval
    /// @param value The amount of the given token the target will be allowed to spend
    function safeApprove(
        address token,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.approve.selector, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "SA"
        );
    }
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    function increaseLiquidity(IncreaseLiquidityParams calldata params)
        external
        payable
        returns (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );
        
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

contract LiquidityManager is IERC721Receiver, Ownable {
    INonfungiblePositionManager public immutable nonfungiblePositionManager;

    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
    }

    mapping(uint256 => Deposit) public deposits;

    constructor(INonfungiblePositionManager _nonfungiblePositionManager) Ownable(msg.sender) {
        nonfungiblePositionManager = _nonfungiblePositionManager;
    }

    /// @notice Handles the receipt of an NFT
    /// @dev The contract that is transferring the NFT must implement the IERC721Receiver interface
    function onERC721Received(
        address operator,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // El owner real debe ser tx.origin (el usuario que envió la transacción)
        _createDeposit(tx.origin, tokenId);
        return this.onERC721Received.selector;
    }

    function _createDeposit(address owner, uint256 tokenId) internal {
        (
            ,
            ,
            address token0,
            address token1,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(tokenId);

        // Store the deposit information
        deposits[tokenId] = Deposit({
            owner: owner,
            liquidity: liquidity,
            token0: token0,
            token1: token1
        });
    }

    struct MintNewPositionParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0ToMint;
        uint256 amount1ToMint;
        address recipient;
    }

    /// @notice Mints a new liquidity position for any token pair
    function mintNewPosition(MintNewPositionParams calldata params)
        external
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        // Transfer tokens from user to this contract
        TransferHelper.safeTransferFrom(params.token0, msg.sender, address(this), params.amount0ToMint);
        TransferHelper.safeTransferFrom(params.token1, msg.sender, address(this), params.amount1ToMint);

        // Approve the position manager
        TransferHelper.safeApprove(params.token0, address(nonfungiblePositionManager), params.amount0ToMint);
        TransferHelper.safeApprove(params.token1, address(nonfungiblePositionManager), params.amount1ToMint);

        INonfungiblePositionManager.MintParams memory mintParams = INonfungiblePositionManager.MintParams({
            token0: params.token0,
            token1: params.token1,
            fee: params.fee,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            amount0Desired: params.amount0ToMint,
            amount1Desired: params.amount1ToMint,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this), // Mint to this contract so we can manage it
            deadline: block.timestamp
        });

        // Mint the position
        (tokenId, liquidity, amount0, amount1) = nonfungiblePositionManager.mint(mintParams);

        // Create a deposit record
        address owner = params.recipient == address(0) ? msg.sender : params.recipient;
        _createDeposit(owner, tokenId);

        // Refund leftover tokens to user
        if (amount0 < params.amount0ToMint) {
            TransferHelper.safeApprove(params.token0, address(nonfungiblePositionManager), 0);
            uint256 refund0 = params.amount0ToMint - amount0;
            TransferHelper.safeTransfer(params.token0, msg.sender, refund0);
        }

        if (amount1 < params.amount1ToMint) {
            TransferHelper.safeApprove(params.token1, address(nonfungiblePositionManager), 0);
            uint256 refund1 = params.amount1ToMint - amount1;
            TransferHelper.safeTransfer(params.token1, msg.sender, refund1);
        }
    }

    function collectAllFees(uint256 tokenId) public returns (uint256 amount0, uint256 amount1) {
        // Only the owner of the deposit can collect fees
        require(deposits[tokenId].owner == msg.sender, "Not the owner");

        // Set up parameters for collecting fees
        INonfungiblePositionManager.CollectParams memory params = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId,
            recipient: msg.sender,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        // Collect the fees
        (amount0, amount1) = nonfungiblePositionManager.collect(params);
    }

    function decreaseLiquidity(uint256 tokenId, uint128 liquidityToRemove) external returns (uint256 amount0, uint256 amount1) {
        // Only the owner of the deposit can decrease liquidity
        require(deposits[tokenId].owner == msg.sender, "Not the owner");

        // Define parameters for decreasing liquidity
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager
            .DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidityToRemove,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });

        // Decrease liquidity
        (amount0, amount1) = nonfungiblePositionManager.decreaseLiquidity(params);

        // Update the deposit's liquidity
        deposits[tokenId].liquidity -= liquidityToRemove;
        
        // Collect the tokens from the decrease
        collectAllFees(tokenId);
    }

    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0ToAdd,
        uint256 amount1ToAdd
    ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
        // Only the owner of the deposit can increase liquidity
        require(deposits[tokenId].owner == msg.sender, "Not the owner");

        address token0 = deposits[tokenId].token0;
        address token1 = deposits[tokenId].token1;

        // Transfer tokens from user to this contract
        TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0ToAdd);
        TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1ToAdd);

        // Approve the position manager
        TransferHelper.safeApprove(token0, address(nonfungiblePositionManager), amount0ToAdd);
        TransferHelper.safeApprove(token1, address(nonfungiblePositionManager), amount1ToAdd);

        // Define parameters for increasing liquidity
        INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager
            .IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: amount0ToAdd,
                amount1Desired: amount1ToAdd,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });

        // Increase liquidity
        (liquidity, amount0, amount1) = nonfungiblePositionManager.increaseLiquidity(params);

        // Update the deposit's liquidity
        deposits[tokenId].liquidity += liquidity;

        // Refund leftover tokens
        if (amount0 < amount0ToAdd) {
            TransferHelper.safeApprove(token0, address(nonfungiblePositionManager), 0);
            uint256 refund0 = amount0ToAdd - amount0;
            TransferHelper.safeTransfer(token0, msg.sender, refund0);
        }
        if (amount1 < amount1ToAdd) {
            TransferHelper.safeApprove(token1, address(nonfungiblePositionManager), 0);
            uint256 refund1 = amount1ToAdd - amount1;
            TransferHelper.safeTransfer(token1, msg.sender, refund1);
        }
    }

    function getLiquidity(uint256 tokenId) external view returns (uint128 liquidity) {
        (, , , , , , , liquidity, , , , ) = nonfungiblePositionManager.positions(tokenId);
    }

    /// @notice Allows the user to retrieve their NFT from the contract
    function retrieveNFT(uint256 tokenId) external {
        require(deposits[tokenId].owner == msg.sender, "Not the owner");
        
        // Delete the deposit record
        delete deposits[tokenId];

        // Transfer the NFT back to the user
        nonfungiblePositionManager.safeTransferFrom(address(this), msg.sender, tokenId);
    }
    
    /// @notice Withdraws tokens stuck in the contract. Only callable by the contract owner.
    function withdrawToken(address token, uint256 amount) external onlyOwner {
         require(amount > 0, "Amount must be > 0");
         TransferHelper.safeTransfer(token, msg.sender, amount);
    }
}