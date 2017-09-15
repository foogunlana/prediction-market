pragma solidity ^0.4.15;

import { Ownable } from 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract PredictionMarketI is Ownable {

    function ask(string _phrase) public returns(bool success);
    function deposit() public payable returns(bool success);
    function pauseQuestion(string _phrase) public returns(bool success);
    function unpauseQuestion(string _phrase) public returns(bool success);
    function addAdmin(address _user) public returns(bool success);
    function getQuestionCount() public constant returns(uint256);
    function getQuestion(string _phrase) public constant returns(address);
}
