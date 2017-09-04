pragma solidity ^0.4.15;

// Adapted from https://github.com/brynbellomy/consensys-academy-prediction-market/blob/master/contracts/SafeMath.sol

library SafeMath {
    function safeMul(uint self, uint b) internal returns (uint) {
        uint c = self * b;
        require(self == 0 || c / self == b);
        return c;
    }

    function safeDiv(uint self, uint b) internal returns (uint) {
        require(b > 0);
        uint c = self / b;
        require(self == b * c + self % b);
        return c;
    }

    function safeSub(uint self, uint b) internal returns (uint) {
        require(b <= self);
        return self - b;
    }

    function safeAdd(uint self, uint b) internal returns (uint) {
        uint c = self + b;
        require(c>=self && c>=b);
        return c;
    }
}
