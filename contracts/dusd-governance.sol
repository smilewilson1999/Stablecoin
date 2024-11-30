// SPDX-License-Identifier: MIT LICENSE

pragma solidity ^0.8.18.0;

import "@openzeppelin/contracts@4.8.3/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.8.3/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.8.3/utils/math/SafeMath.sol";
import "@openzeppelin/contracts@4.8.3/access/Ownable.sol";
import "@openzeppelin/contracts@4.8.3/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.8.3/access/AccessControl.sol";
import "./dusd.sol";
import "./duducoin.sol";

contract DUSDGovern is Ownable, ReentrancyGuard, AccessControl { 
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct SupChange {
        string method;
        uint256 amount;
        uint256 timestamp;
        uint256 blocknum;
    }

    struct ReserveList {
        IERC20 colToken;
    }

    mapping (uint256 => ReserveList) public rsvList;

    DUSD private dusd;
    DUDU private dudu;
    address private reserveContract;
    uint256 public dusdsupply;
    uint256 public dudusupply;
    address public datafeed;
    uint256 public supplyChangeCount;
    uint256 public stableColatPrice = 1e18; 
    uint256 public stableColatAmount;
    uint256 private constant COL_PRICE_TO_WEI = 1e10;
    uint256 private constant WEI_VALUE = 1e18;
    uint256 public unstableColatAmount;
    uint256 public marketcap;
    uint256 public unstableColPrice;
    uint256 public reserveCount;

    mapping (uint256 => SupChange) public _supplyChanges;

    bytes32 public constant GOVERN_ROLE = keccak256("GOVERN_ROLE");

    event RepegAction(uint256 time, uint256 amount);
    event Withdraw(uint256 time, uint256 amount);

    constructor(DUSD _dusd, DUDU _dudu) {
        dusd = _dusd;
        dudu = _dudu;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(GOVERN_ROLE, _msgSender());
    }

    function addColateralToken(IERC20 colcontract) external nonReentrant {
        require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
        rsvList[reserveCount].colToken = colcontract;
        reserveCount++;
    }

    function setReserveContract(address reserve) external nonReentrant {
        require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
        reserveContract = reserve;
    }

    /*
    * This function is to fake the price feed for our utility token
    * Token price is calculated based on the marketcap of the token divided by the total supply
    * If the Duducoin (DUDU) was offically listed on an exchange, the price would be fetched from the oracle (price.oracle.sol)
    */
    function setDUDUTokenPrice(uint256 _marketcap) external nonReentrant {
        require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
        marketcap = _marketcap;
        dudusupply = dudu.totalSupply();
        unstableColPrice = ((marketcap).mul(dudusupply)).div(WEI_VALUE);
    }


    function colateralReBalancing() internal returns (bool) {
        require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
        uint256 stableBalance = rsvList[0].colToken.balanceOf(reserveContract);
        uint256 unstableBalance = rsvList[1].colToken.balanceOf(reserveContract);
        if (stableBalance != stableColatAmount) {
            stableColatAmount = stableBalance;
        }
        if (unstableBalance != unstableColatAmount) {
            unstableColatAmount = unstableBalance;
        }
        return true;
    }

    function setDUSDSupply(uint256 totalSupply) external {
         require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
         dusdsupply = totalSupply;
    }

    /*
    * This function is the algorithmic stablecoin re-pegging function
    * Algrithmic stablecoin: Dudu USD (DUSD)
    * Stable collateral: Tether (USDT)
    * Unstable collateral: Duducoin (DUDU)
    */
    function validatePeg() external nonReentrant {
        require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");

        bool result = colateralReBalancing();
        if (result) {
            uint256 rawcolvalue = (stableColatAmount.mul(WEI_VALUE)).add(unstableColatAmount.mul(unstableColPrice));
            uint256 colvalue = rawcolvalue.div(WEI_VALUE);

            require(dusdsupply > 0, "dusdsupply is zero");

            if (colvalue < dusdsupply) {
                uint256 supplyChange = dusdsupply.sub(colvalue);

                require(unstableColPrice > 0, "unstableColPrice is zero");
                uint256 burnAmount = (supplyChange.div(unstableColPrice)).mul(WEI_VALUE);

                dudu.burn(burnAmount);
                _supplyChanges[supplyChangeCount].method = "Burn";
                _supplyChanges[supplyChangeCount].amount = supplyChange;
            }

            if (colvalue > dusdsupply) {
                uint256 supplyChange = colvalue.sub(dusdsupply);
                dudu.mint(supplyChange);

                _supplyChanges[supplyChangeCount].method = "Mint";
                _supplyChanges[supplyChangeCount].amount = supplyChange;
            }

            _supplyChanges[supplyChangeCount].blocknum = block.number;
            _supplyChanges[supplyChangeCount].timestamp = block.timestamp;
            supplyChangeCount++;

            emit RepegAction(block.timestamp, colvalue);
        }
    }

    function withdraw(uint256 _amount) external nonReentrant {
        require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
        dusd.transfer(address(msg.sender), _amount);
        emit Withdraw(block.timestamp, _amount);
    }

    function withdrawDUDU(uint256 _amount) external nonReentrant {
        require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
        dudu.transfer(address(msg.sender), _amount);
        emit Withdraw(block.timestamp, _amount);
    }

    // If the Duducoin (DUDU) was offically listed on an exchange, the price would be fetched from the oracle (e.g. Chainlink)
    // function setDataFeedAddress(address contractaddress) external {
    //     require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
    //     datafeed = contractaddress;
    //     priceOracle = AggregatorV3Interface(datafeed);
    // }

    // function fetchColPrice() external nonReentrant {
    //     require(hasRole(GOVERN_ROLE, _msgSender()), "Not allowed");
    //     ( , uint256 price, , , ) = priceOracle.latestRoundData();
    //     uint256 value = (price).mul(COL_PRICE_TO_WEI);
    //     unstableColPrice = value;
    // }
}
