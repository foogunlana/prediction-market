pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract PredictionMarket is Ownable {
    struct Question {
        uint yesAmount;
        uint noAmount;
        uint yesCount;
        uint noCount;
    }
    mapping (address => bool) public isAdmin;
    mapping (bytes32 => Question) public questions;

    event LogAddAdmin(address _admin);
    event LogAddQuestion(address _admin, string _question);

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
        questions[questionHash] = Question(0, 0, 0, 0);
        LogAddQuestion(msg.sender, _question);
        return true;
    }
}
