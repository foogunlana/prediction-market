const PredictionMarket = artifacts.require("./PredictionMarket.sol");

contract("PredictionMarket", accounts => {
  const owner = accounts[0];
  const administrator = accounts[1];
  let instance;

  beforeEach(() => {
    return new PredictionMarket(
      administrator,
      {from: owner})
    .then(_instance => {
      instance = _instance;
    });
  });

  it("should allow a creator add an administrator", () => {
    return instance.admin()
    .then(_admin => {
      assert.equal(
        _admin,
        administrator,
        "Administrator was not set!"
      );
    });
  });
});
