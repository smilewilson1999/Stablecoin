// SPDX-License-Identifier: MIT LICENSE
pragma solidity ^0.8.17.0;

import "@openzeppelin/contracts@4.8.3/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.8.3/utils/math/SafeMath.sol";
import "@openzeppelin/contracts@4.8.3/access/Ownable.sol";
import "@openzeppelin/contracts@4.8.3/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.8.3/access/AccessControl.sol";

contract DUSDReserves is Ownable, ReentrancyGuard, AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public currentReserveId;

    struct ReserveVault {
        IERC20 collateral;
        uint256 amount;
    }

    mapping(uint256 => ReserveVault) public _rsvVault;

    event Withdraw (uint256 indexed vid, uint256 amount);
    event Deposit (uint256 indexed vid, uint256 amount);

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MANAGER_ROLE, _msgSender());
    }

    /*
    * @dev Check if Reserve Contract Already Added (Make sure it is not duplicated)
    * @param _collateral - Collateral Address
    */
    function checkReserveContract(IERC20 _collateral) internal view {
        for(uint256 i; i < currentReserveId; i++){
            require(_rsvVault[i].collateral != _collateral, "Collateral Address Already Added");
        }
    }

    /*
    * @dev Add Reserve Vault
    * @param _collateral - Collateral Address
    */
    function addReserveVault(IERC20 _collateral) external {
        require(hasRole(MANAGER_ROLE, _msgSender()), "Not allowed");
        checkReserveContract(_collateral);
        _rsvVault[currentReserveId].collateral = _collateral;
        currentReserveId++; // Make the next ID available to use
    }
    /*
    * @dev Deposit Collateral
    * @param vid - Reserve Vault ID
    * @param amount - Amount to Deposit
    */
    function depositCollateral(uint256 vid, uint256 amount) external {
        require(hasRole(MANAGER_ROLE, _msgSender()), "Not allowed");
        IERC20 reserves = _rsvVault[vid].collateral;
        reserves.safeTransferFrom(address(msg.sender), address(this), amount);
        uint256 currentVaultBalance = _rsvVault[vid].amount;
        _rsvVault[vid].amount = currentVaultBalance.add(amount);
        emit Deposit(vid, amount);
    }

    /*
    * @dev Withdraw Collateral
    * @param vid - Reserve Vault ID
    * @param amount - Amount to withdraw
    */
    function withdrawCollateral(uint256 vid, uint256 amount) external {
        require(hasRole(MANAGER_ROLE, _msgSender()), "Not allowed");
        IERC20 reserves = _rsvVault[vid].collateral;
        uint256 currentVaultBalance = _rsvVault[vid].amount;
        if (currentVaultBalance >= amount) {
            reserves.safeTransfer(address(msg.sender), amount);
            _rsvVault[vid].amount = currentVaultBalance.sub(amount);
            emit Withdraw(vid, amount);
        }
    }
}
