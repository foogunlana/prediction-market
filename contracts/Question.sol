pragma solidity ^0.4.15;

import { Pausable } from 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import { SafeMath } from './SafeMath.sol';
import { PredictionMarketI } from './PredictionMarketI.sol';

contract Question is Pausable {
    using SafeMath for uint256;

    struct User {
        bool isAdmin;
        bool isTrustedSource;
        bool hasWithdrawn;
        uint256 guess;
        uint256 amount;
    }
    mapping (address => User) private users;

    uint256 public remainder;
    uint256 public total;
    uint256 public answer;
    string public phrase;
    bool public answered;

    modifier onlyAdmin { require(users[msg.sender].isAdmin); _;}
    modifier onlyTrustedSource { require(users[msg.sender].isTrustedSource); _;}

    event LogAddAdmin(address indexed _sender, address indexed _admin);
    event LogAddTrustedSource(address indexed _sender, address indexed _trustedSource);
    event LogAnswer(address indexed _sender, uint256 _answer);
    event LogWithdraw(address _sender, uint256 _amount);
    event LogPlaceBet(
        address indexed _sender,
        uint256 _guessed,
        uint256 _spent);

    function Question(address _sponsor, string _phrase) {
        phrase = _phrase;
        users[msg.sender].isAdmin = true;
        users[_sponsor].isAdmin = true;
    }

    function addAdmin(address _admin)
        public
        onlyAdmin
        whenNotPaused
        returns(bool)
    {
        users[_admin].isAdmin = true;
        LogAddAdmin(msg.sender, _admin);
        return true;
    }

    function addTrustedSource(address _trustedSource)
        public
        onlyAdmin
        whenNotPaused
        returns(bool)
    {
        users[_trustedSource].isTrustedSource = true;
        LogAddTrustedSource(msg.sender, _trustedSource);
        return true;
    }

    function guess(uint256 _numberGuessed)
        public
        payable
        whenNotPaused
        returns(bool)
    {
        require(!answered);
        require(msg.value > 0);

        uint256 oldAmount = users[msg.sender].amount;
        users[msg.sender].amount = 0; // optimistic accounting
        total -= oldAmount;
        msg.sender.transfer(oldAmount);

        users[msg.sender].guess = _numberGuessed;
        users[msg.sender].amount = msg.value;
        total += msg.value;
        LogPlaceBet(msg.sender, _numberGuessed, msg.value);
        return true;
    }

    // Answer can be seen as a transaction before being mined
    // Consider finalising before resolving
    function resolve(uint256 _answer)
        public
        onlyTrustedSource
        whenNotPaused
        returns(bool)
    {
        require(!answered);
        answer = _answer;
        answered = true;
        /*PredictionMarketI(owner).deposit.value(total / 10)(); // commission*/
        LogAnswer(msg.sender, answer);
        return true;
    }

    function withdraw()
        public
        whenNotPaused
        returns(bool)
    {
        require(!users[msg.sender].hasWithdrawn);
        require(answered);

        users[msg.sender].hasWithdrawn = true;
        if (users[msg.sender].guess == answer) {
            msg.sender.transfer(total);
            LogWithdraw(msg.sender, total);
        }
        return true;
    }

    function guessed(address _user)
        public
        constant
        returns(uint256)
    {
        return users[_user].guess;
    }

    function isAdmin(address user)
        public
        constant
        returns(bool)
    {
        return users[user].isAdmin;
    }

    function isTrustedSource(address user)
        public
        constant
        returns(bool)
    {
        return users[user].isTrustedSource;
    }

    function hasWithdrawn(address user)
        public
        constant
        returns(bool)
    {
        return users[user].hasWithdrawn;
    }
}
