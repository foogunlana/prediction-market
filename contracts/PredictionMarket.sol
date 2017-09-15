pragma solidity ^0.4.15;

import { Ownable } from 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import { Question } from './Question.sol';


contract PredictionMarket is Ownable {
    struct Query {
        address question;
        uint index;
    }
    mapping (address => bool) public isAdmin;
    mapping (bytes32 => Query) public queries;
    bytes32[] public phraseHashes;

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
        bytes32 questionHash = keccak256(_phrase);
        Question question = new Question(msg.sender, _phrase);
        queries[questionHash].question = question;
        queries[questionHash].index = phraseHashes.push(questionHash) - 1;
        LogCreateQuestion(msg.sender, _phrase, question);
        return true;
    }

    function deposit()
        public
        payable
        returns(bool succes)
    {
        // see https://ethereum.stackexchange.com/questions/12765/type-inaccessible-dynamic-type-is-not-implicitly-convertible-to-expected-type
        /*bytes32 questionHash = keccak256(Question(msg.sender).phrase());
        require(questionHash == phraseHashes[queries[questionHash].index]);*/
        return true;
    }

    function pauseQuestion(string _phrase)
        public
        onlyAdmin
        returns(bool success)
    {
        bytes32 questionHash = keccak256(_phrase);
        require(questionHash == phraseHashes[queries[questionHash].index]);
        return Question(queries[questionHash].question).pause();
    }

    function unpauseQuestion(string _phrase)
        public
        onlyAdmin
        returns(bool success)
    {
        bytes32 questionHash = keccak256(_phrase);
        require(questionHash == phraseHashes[queries[questionHash].index]);
        return Question(queries[questionHash].question).unpause();
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

    // I wish to be tested too!
    function getQuestionCount()
        public
        constant
        returns(uint256)
    {
        return phraseHashes.length;
    }

    function getQuestion(string _phrase)
        public
        constant
        returns(address)
    {
        bytes32 questionHash = keccak256(_phrase);
        require(questionHash == phraseHashes[queries[questionHash].index]);
        return queries[questionHash].question;
    }
}
