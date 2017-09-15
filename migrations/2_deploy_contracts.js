var Question = artifacts.require("./Question.sol");
var PredictionMarket = artifacts.require("./PredictionMarket.sol");

module.exports = function(deployer) {
  deployer.deploy(PredictionMarket);
  deployer.deploy(Question);
};
