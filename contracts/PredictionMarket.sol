pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract PredictionMarket is Ownable {
    mapping (address => bool) public isAdmin;
    mapping (bytes32 => string) public questions;

    event LogAddAdmin(address _admin);
    event LogAddQuestion(address _admin, bytes32 _questionHash);

    function PredictionMarket() {
        isAdmin[msg.sender] = true;
    }

    modifier onlyAdmin {
        require(isAdmin[msg.sender]);
        _;
    }

    function addAdmin(address _admin)
        public
        onlyAdmin
        returns(bool)
    {
        isAdmin[_admin] = true;
        LogAddAdmin(_admin);
        return true;
    }

    function addQuestion(string _question)
        public
        onlyAdmin
        returns(bool)
    {
        bytes32 questionHash = sha3(_question);
        questions[questionHash] = _question;
        LogAddQuestion(msg.sender, questionHash);
        return true;
    }
}
