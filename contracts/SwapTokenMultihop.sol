// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

contract SwapTokenMultihop {
    ISwapRouter public immutable swapRouter;
    IQuoter public immutable quoter;
    address public owner;

    constructor(ISwapRouter _swapRouter, IQuoter _quoter) {
        swapRouter = _swapRouter;
        quoter = _quoter;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Swaps a fixed amount of tokenIn for a maximum possible amount of tokenOut through an intermediary pool.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its tokenIn for this function to succeed.
    /// @param path The path of token addresses and pool fees. Path must be encoded as: tokenIn, fee1, tokenMiddle, fee2, tokenOut
    /// @param amountIn The amount of tokenIn to send.
    /// @param amountOutMinimum The minimum amount of tokenOut that must be received for the transaction not to revert.
    /// @return amountOut The amount of tokenOut received.
    function swapExactInputMultihop(
        bytes memory path,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external returns (uint256 amountOut) {
        // Decode the first token from the path to transfer from the user
        address tokenIn;
        assembly {
            tokenIn := mload(add(path, 32))
        }

        // Transfer the specified amount of tokenIn to this contract.
        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);

        // Approve the router to spend tokenIn.
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        // Set up parameters for the swap.
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum
        });

        // Execute the swap.
        amountOut = swapRouter.exactInput(params);
    }

    /// @notice Swaps as little as possible of tokenIn for an exact amount of tokenOut through an intermediary pool.
    /// @dev The calling address must approve this contract to spend its tokenIn for this function to succeed.
    /// @param path The path of token addresses and pool fees. Path must be encoded as: tokenIn, fee1, tokenMiddle, fee2, tokenOut
    /// @param amountOut The exact amount of tokenOut to receive.
    /// @param amountInMaximum The maximum amount of tokenIn that can be required before the transaction reverts.
    /// @return amountIn The amount of tokenIn actually spent in the swap.
    function swapExactOutputMultihop(
        bytes memory path,
        uint256 amountOut,
        uint256 amountInMaximum
    ) external returns (uint256 amountIn) {
        // Decode the first token from the path to transfer from the user
        address tokenIn;
        assembly {
            tokenIn := mload(add(path, 32))
        }

        // Transfer the specified amount of tokenIn to this contract.
        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountInMaximum);

        // Approve the router to spend tokenIn.
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountInMaximum);

        // Set up parameters for the swap.
        ISwapRouter.ExactOutputParams memory params = ISwapRouter.ExactOutputParams({
            path: path,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountOut: amountOut,
            amountInMaximum: amountInMaximum
        });

        // Execute the swap.
        amountIn = swapRouter.exactOutput(params);

        // If the actual amount spent (amountIn) is less than the maximum amount specified,
        // refund the difference to the user.
        if (amountIn < amountInMaximum) {
            // Reset approval to zero.
            TransferHelper.safeApprove(tokenIn, address(swapRouter), 0);
            // Refund the difference to the user.
            uint256 refund = amountInMaximum - amountIn;
            TransferHelper.safeTransfer(tokenIn, msg.sender, refund);
        }
    }

    /// @notice Get the quote for an exact input multihop swap.
    /// @param path The path of token addresses and pool fees
    /// @param amountIn The amount of the first token to swap
    /// @return amountOut The amount of the last token that would be received
    function quoteExactInputMultihop(
        bytes memory path,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        return quoter.quoteExactInput(path, amountIn);
    }

    /// @notice Get the quote for an exact output multihop swap.
    /// @param path The path of token addresses and pool fees (must be reversed for exact output)
    /// @param amountOut The amount of the last token to receive
    /// @return amountIn The amount of the first token that would be required
    function quoteExactOutputMultihop(
        bytes memory path,
        uint256 amountOut
    ) external returns (uint256 amountIn) {
        return quoter.quoteExactOutput(path, amountOut);
    }

    /// @notice Allows the owner to withdraw any tokens sent to this contract.
    /// @param token The address of the token to withdraw
    /// @param amount The amount of tokens to withdraw
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        TransferHelper.safeTransfer(token, msg.sender, amount);
    }
}
