pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract PredictionMarket is Ownable {
    mapping (address => bool) public isAdmin;

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
        return true;
    }
}
