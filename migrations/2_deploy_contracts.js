var Question = artifacts.require("./Question.sol");

module.exports = function(deployer) {
  deployer.deploy(Question);
};
