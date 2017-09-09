const PredictionMarket = artifacts.require("./PredictionMarket.sol");

function getTransactionReceiptMined(txHash, interval) {
  const transactionReceiptAsync = function(resolve, reject) {
    web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
      if (error) {
        reject(error);
      } else if (receipt == null) {
        setTimeout(
          () => transactionReceiptAsync(resolve, reject),
          interval ? interval : 500);
      } else {
        resolve(receipt);
      }
    });
  };

  if (Array.isArray(txHash)) {
    return Promise.all(txHash.map(
      oneTxHash => getTransactionReceiptMined(oneTxHash, interval)));
  } else if (typeof txHash === "string") {
    return new Promise(transactionReceiptAsync);
  } else {
    throw new Error("Invalid Type: " + txHash);
  }
}

function expectedExceptionPromise(action, gasToUse) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(action());
    } catch(e) {
      reject(e);
    }
  })
  .then(function (txn) {
    // https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
    return getTransactionReceiptMined(txn);
  })
  .then(function (receipt) {
    // We are in Geth
    assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
  })
  .catch(function (e) {
    if (((e + "").indexOf("invalid opcode") > -1) || ((e + "").indexOf("out of gas") > -1)) {
      // We are in TestRPC
    } else if ((e + "").indexOf("please check your gas amount") > -1) {
      // We are in Geth for a deployment
    } else {
      throw e;
    }
  });
}

function solSha3 (...args) {
  args = args.map(arg => {
    if (typeof arg === "string") {
      if (arg.substring(0, 2) === "0x") {
        return arg.slice(2);
      } else {
        return web3.toHex(arg).slice(2);
      }
    }
  });
  args = args.join("");
  return web3.sha3(args, { encoding: "hex" });
}


contract("PredictionMarket", accounts => {
  const owner = accounts[0];
  const admin = accounts[1];
  const otherAdmin = accounts[2];
  const notAdmin = accounts[3];
  const trustedSource = accounts[4];
  const user = accounts[5];
  const otherUsers = accounts.slice(6, 9);
  const question1 = "Does life have any meaning?";
  const yesAmountIndex = 0;
  const noAmountIndex = 1;
  const answerIndex = 2;
  const Answer = {
    None: 0,
    Yes: 1,
    No: 2
  };
  let instance;

  beforeEach(() => {
    return PredictionMarket.new(
      {from: owner})
    .then(_instance => {
      instance = _instance;
      return instance.addAdmin(
        admin,
        {from: owner});
    })
    .then(() => {
      return instance.addTrustedSource(
        trustedSource,
        {from: admin});
    });
  });

  it("should add the owner as an admin", () => {
    return instance.owner()
    .then(_owner => {
      return instance.isAdmin(_owner);
    })
    .then(isAdmin => {
      assert(isAdmin, "Owner was not set as admin");
    });
  });

  describe("Admin permissions", () => {
    it("should let only admins add other admins", () => {
      return instance.isAdmin(admin)
      .then(isAdmin => {
        assert(isAdmin, "Owner could not set admin, is owner not an admin?");
        return instance.addAdmin(
          otherAdmin,
          {from: admin});
      })
      .then(() => {
        return instance.isAdmin(otherAdmin);
      })
      .then(isAdmin => {
        assert(isAdmin, "Admin could not set another admin!");
        return expectedExceptionPromise(() => {
          return instance.addAdmin(
            otherAdmin,
            {from: notAdmin, gas: 2000000});
        }, 2000000);
      })
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Anyone can set an admin!");
        } else {
          throw e;
        }
      });
    });

    it("should let only admins add questions", () => {
      return instance.addQuestion(
        question1,
        {from: admin})
      .then(() => {
        return instance.questions(solSha3(question1));
      })
      .catch(() => {
        assert(false, "An admin could not create a question");
      })
      .then(_question => {
        _question.map(n => {
          assert.equal(
            n.valueOf(),
            "0",
            "The question not properly initialized!");
        });
        return expectedExceptionPromise(() => {
          return instance.addQuestion(
            question1,
            {from: notAdmin, gas: 2000000});
        }, 2000000);
      })
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Anyone can set a question!");
        } else {
          throw e;
        }
      });
    });

    it("should let only admins add trusted sources", () => {
      return instance.isTrustedSource(trustedSource)
      .catch(() => {
        assert(false, "An admin could not add a trusted source");
        return expectedExceptionPromise(() => {
          return instance.addTrustedSource(
            trustedSource,
            {from: notAdmin, gas: 2000000});
        }, 2000000);
      })
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Anyone can set a trusted source!");
        } else {
          throw e;
        }
      });
    });
  });

  describe("Trusted source permissions", () => {
    it("should allow only trusted sources answer questions", () => {
      const answer = true;
      return expectedExceptionPromise(() => {
        return instance.answerQuestion(
          question1,
          answer,
          {from: user, gas: 2000000});
      }, 2000000)
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Anyone can answer a question!");
        } else {
          throw e;
        }
      })
      .then(() => {
        return instance.answerQuestion(
          question1,
          answer,
          {from: trustedSource});
      })
      .then(() => {
        return instance.questions(solSha3(question1));
      })
      .then(question => {
        assert.equal(
          question[answerIndex].valueOf(),
          Answer.Yes,
          "The answer was not set.");
      });
    });
  });

  describe("User API", () => {
    it("should allow anyone place a bet on an unanswered question", () => {
      const yesAmount = web3.toWei(1, "ether");
      const noAmount = web3.toWei(1, "ether");
      const amount = web3.toWei(2, "ether");
      const answer = true;
      return instance.placeBet(
        question1,
        yesAmount,
        noAmount,
        {from: user, value: amount})
      .then(() => {
        return instance.questions(solSha3(question1));
      })
      .then(_question => {
        assert.equal(
          _question[yesAmountIndex].valueOf(),
          yesAmount.toString(),
          "Bet yes value was not added to question");
        assert.equal(
          _question[noAmountIndex].valueOf(),
          noAmount.toString(),
          "Bet no value was not added to question");
        return instance.bets(solSha3(solSha3(question1), user));
      })
      .then(_bet => {
        assert.equal(
          _bet[yesAmountIndex].valueOf(),
          yesAmount.toString(),
          "Bet yes was not placed by user");
        assert.equal(
          _bet[noAmountIndex].valueOf(),
          noAmount.toString(),
          "Bet no was not placed by user");
        return instance.answerQuestion(
          question1,
          answer,
          {from: trustedSource});
      })
      .then(() => {
        return expectedExceptionPromise(() => {
          return instance.placeBet(
            question1,
            yesAmount,
            noAmount,
            {from: user, value: amount});
        })
        .catch(e => {
          if (e.toString().indexOf("Invalid Type") != -1) {
            assert(false, "Seems bets can still be placed after question is answered!");
          } else {
            throw e;
          }
        });
      });
    });

    it("should reject bets that don't add up (i.e. yes + no != total)", () => {
      const yesAmount = web3.toWei(1, "ether");
      const noAmount = web3.toWei(1, "ether");
      const amount = web3.toWei(1, "ether");
      return expectedExceptionPromise(() => {
        return instance.placeBet(
          question1,
          yesAmount,
          noAmount,
          {from: user, value: amount, gas: 2000000});
      }, 2000000)
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Invalid amounts can be set!");
        } else {
          throw e;
        }
      });
    });

    // INCOMPLETE TEST!!!
    it("should allow winning users withdraw after question resolution", () => {
      let users = [{
        address: otherUsers[0],
        yesAmount: web3.toWei(1.5, "ether"),
        noAmount: web3.toWei(1, "ether"),
      }, {
        address: otherUsers[1],
        yesAmount: web3.toWei(0, "ether"),
        noAmount: web3.toWei(2, "ether"),
      }, {
        address: otherUsers[2],
        yesAmount: web3.toWei(3, "ether"),
        noAmount: web3.toWei(1, "ether"),
      }];
      let totalYesAmount = users.reduce(
        (total, user) => parseFloat(user.yesAmount) + total, 0);
      let totalNoAmount = users.reduce(
        (total, user) => parseFloat(user.noAmount) + total, 0);
      let total = totalNoAmount + totalYesAmount;
      const answer = true;
      const gasPrice = 1000000;
      let ETHUsed;
      let originalBalances;
      return instance.addQuestion(
        question1,
        {from: admin})
      .then(() => {
        return Promise.all(users.map(u => instance.placeBet(
          question1,
          u.yesAmount,
          u.noAmount,
          {
            from: u.address,
            value: parseInt(u.yesAmount) + parseInt(u.noAmount)
          })));
      })
      .then(() => {
        return instance.answerQuestion(
          question1,
          answer,
          {from: trustedSource});
      })
      .then(() => {
        return Promise.all(users.map(u => web3.eth.getBalance(u.address)));
      })
      .then(_balances => {
        originalBalances = _balances;
        return Promise.all(users.map(u =>
          instance.withdraw(
            question1,
            {from: u.address, gasPrice: gasPrice})));
      })
      .then(txs => {
        ETHUsed = txs.map(tx => tx.receipt.gasUsed * gasPrice);
        return Promise.all(users.map(u => web3.eth.getBalance(u.address)));
      })
      .then(_balances => {
        for (let i in _balances) {
          let reward = (parseFloat(users[i].yesAmount)/parseFloat(totalYesAmount)) * total;
          // Big number cannot add to sig figs over 15 so must round reward!
          let rounder = 10000;
          let roundedReward = reward - (reward%rounder);
          assert(
            _balances[i]
            .minus(originalBalances[i]
              .plus(roundedReward)
              .minus(ETHUsed[i]))
            .lte(rounder),
            "Exact reward amount not returned to user!");
        }
      });
    });
  });
});
