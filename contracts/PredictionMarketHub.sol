pragma solidity ^0.4.15;

import { Ownable } from 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import { Question } from './Question.sol';


contract PredictionMarketHub is Ownable {
    address[] public markets;
    mapping (address => bool) marketExists;

    modifier onlyExistingMarkets(address _market) {
        require(marketExists[_market]);
        _;
    }

    event LogCreateMarket(address _creator, address _market);

    function Hub() {}

    function createMarket(address _sponsor)
        public
        onlyOwner
        returns(bool success)
    {
        Question market = new Question(_sponsor);
        markets.push(market);
        marketExists[market] = true;
        LogCreateMarket(_sponsor, market);
        return true;
    }

    function pauseMarket(address _market)
        public
        onlyOwner
        onlyExistingMarkets(_market)
        returns(bool success)
    {
        return Question(_market).pause();
    }

    function unpauseMarket(address _market)
        public
        onlyOwner
        onlyExistingMarkets(_market)
        returns(bool success)
    {
        return Question(_market).unpause();
    }
}
