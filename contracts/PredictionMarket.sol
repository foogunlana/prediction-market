pragma solidity ^0.4.15;

import { Ownable } from 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import { Question } from './Question.sol';


contract PredictionMarket is Ownable {

    mapping (address => bool) public isAdmin;
    mapping (bytes32 => address) public questions;
    mapping (bytes32 => bool) public questionExists;
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
        bytes32 questionHash = keccak256(_phrase);
        Question question = new Question(msg.sender, _phrase);
        questions[questionHash] = question;
        questionExists[questionHash] = true;
        LogCreateQuestion(msg.sender, _phrase, question);
        return true;
    }

    function pauseQuestion(string _phrase)
        public
        onlyAdmin
        returns(bool success)
    {
        bytes32 questionHash = keccak256(_phrase);
        require(questionExists[questionHash]);
        return Question(questions[questionHash]).pause();
    }

    function unpauseQuestion(string _phrase)
        public
        onlyAdmin
        returns(bool success)
    {
        bytes32 questionHash = keccak256(_phrase);
        require(questionExists[questionHash]);
        return Question(questions[questionHash]).unpause();
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
        bytes32 questionHash = keccak256(_phrase);
        require(questionExists[questionHash]);
        return questions[questionHash];
    }
}
