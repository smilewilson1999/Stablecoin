// SPDX-License-Identifier: MIT LICENSE

pragma solidity ^0.8.18.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/*
* @title PriceOracle
* @dev This contract is used to get the latest price of the Chainlink Oracle
*/
contract PriceOracle {
    using SafeMath for uint256;

    AggregatorV3Interface private priceOracle;
    uint256 public unstableColPrice;
    address public datafeed;

    /*
    * Network: Sepolia
    * Aggregator: ETH/USD
    * Address: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    * If the Duducoin (DUDU) was offically listed on an exchange, the price would be fetched from the oracle (e.g. Chainlink)
    */
    function setDataFeedAddress(address contractaddress) external {
        datafeed = contractaddress;
        priceOracle = AggregatorV3Interface(datafeed);
    }

    /*
    * Returns the latest price
    * Change the price to wei
    */
    function colPriceToWei() external {
        ( ,uint256 price, , , ) = priceOracle.latestRoundData();
        unstableColPrice = price.mul(1e10);
    }

    /*
    * Returns the latest price
    * Only for view
    * return raw price
    */
    function rawColPrice() external view returns (uint256) {
        ( ,uint256 price, , , ) = priceOracle.latestRoundData();
        return price;
    }
}
