// SPDX-License-Identifier: MIT LICENSE
pragma solidity ^0.8.17.0;

import "@openzeppelin/contracts@4.8.3/access/Ownable.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/extensions/ERC20Burnable.sol";

contract USDT is ERC20, ERC20Burnable, Ownable {

  using SafeERC20 for ERC20;

  constructor() ERC20("Tether USD", "USDT") {}

  function mint(uint256 amount) external onlyOwner {
    _mint(msg.sender, amount);
  }

}
