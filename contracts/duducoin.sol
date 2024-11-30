// SPDX-License-Identifier: MIT LICENSE

pragma solidity ^0.8.18.0;

import "@openzeppelin/contracts@4.8.3/access/Ownable.sol";
import "@openzeppelin/contracts@4.8.3/utils/math/SafeMath.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.8.3/access/AccessControl.sol";


contract DUDU is ERC20, ERC20Burnable, Ownable, AccessControl {

    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    mapping (address => uint256) private _balances;

    uint256 private _totalSupply;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    constructor () ERC20("Duducoin", "DUDU") {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MANAGER_ROLE, _msgSender());
    }

    function mint(uint256 amount) external {
        require(hasRole(MANAGER_ROLE, _msgSender()), "Not allowed");
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        _mint(msg.sender, amount);
    }
}