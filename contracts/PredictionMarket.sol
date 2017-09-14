pragma solidity ^0.4.15;

import { Ownable } from 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import { Question } from './Question.sol';


contract PredictionMarket is Ownable {

    mapping (address => bool) public isAdmin;
    mapping (bytes32 => address) public questions;
    // consider struct Question { bool exists; address addr };
    string[] public phrases;

    modifier onlyAdmin {
        require(isAdmin[msg.sender]);
        _;
    }

    event LogCreateQuestion(address indexed _sender, string _phrase, address _question);
    event LogAddAdmin(address indexed _sender, address indexed _admin);

    function PredictionMarket() {
        isAdmin[msg.sender] = true;
    }

    function ask(string _phrase)
        public
        onlyAdmin
        returns(bool success)
    {
        phrases.push(_phrase);
        Question question = new Question(msg.sender, _phrase);
        questions[keccak256(_phrase)] = question;
        LogCreateQuestion(msg.sender, _phrase, question);
        return true;
    }

    function addAdmin(address _user)
        public
        onlyAdmin
        returns(bool success)
    {
        isAdmin[_user] = true;
        LogAddAdmin(msg.sender, _user);
        return true;
    }

    function getQuestion(string _phrase)
        public
        constant
        returns(address)
    {
        return questions[sha3(_phrase)];
    }
}
