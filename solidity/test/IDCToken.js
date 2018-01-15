
// Based on https://github.com/OpenZeppelin/zeppelin-solidity

const IDCToken = artifacts.require("IDCToken");

function increaseTime (duration) {
    const id = Date.now();

    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 => {
            if (err1) return reject(err1);

            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: id + 1,
            }, (err2, res) => {
                return err2 ? reject(err2) : resolve(res);
            });
        });
    });
}

function increaseTimeTo (target) {
    let now = latestTime();
    if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
    let diff = target - now;
    return increaseTime(diff);
}

const duration = {
    seconds: function (val) { return val; },
    minutes: function (val) { return val * this.seconds(60); },
    hours: function (val) { return val * this.minutes(60); },
    days: function (val) { return val * this.hours(24); },
    weeks: function (val) { return val * this.days(7); },
    years: function (val) { return val * this.days(365); },
};

function latestTime () {
    var timestmap = web3.eth.getBlock('latest').timestamp;
    return timestmap;
}

function advanceBlock () {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: Date.now(),
        }, (err, res) => {
            return err ? reject(err) : resolve(res);
        });
    });
}

function assertEquals(a, b, msg) {
    let math = a.equals(b);
    assert.equal(math, true, msg);
}

const BigNumber = web3.BigNumber;

const tokenName = "IDC Token";
const tokenSymbol = "IDC";
const decimalUints = 18;
const decimalAmount = new BigNumber(10 ** 18);

const totalSupply = new BigNumber(8 * 10000 * 10000).mul(decimalAmount);
const rate = new BigNumber(7000);
const capPerAddress = new BigNumber(10).mul(decimalAmount);

startTime = latestTime() + duration.seconds(100);
afterStartTime = startTime + duration.seconds(10);
endTime = startTime + duration.weeks(3);
afterEndTime = endTime + duration.seconds(10);

contract("IDCToken ico", function(accounts) {


    before(async function (){
        await advanceBlock();
    });

    beforeEach(async function () {
        startTime = latestTime() + duration.seconds(100);
        afterStartTime = startTime + duration.seconds(10);
        endTime = startTime + duration.weeks(3);
        afterEndTime = endTime + duration.seconds(10);

        this.IDCTokenSale = await IDCToken.new(tokenName, tokenSymbol, decimalUints, startTime, endTime, totalSupply, rate, capPerAddress, accounts[3]);
    });

    it("should right initialized", async function () {
        let actualTokenName = await this.IDCTokenSale.name();
        assert.equal(actualTokenName, tokenName, "wrong token name");

        let actualSymbol = await this.IDCTokenSale.symbol();
        assert.equal(actualSymbol, tokenSymbol, "wrong symbol");

        let actualDecinalUints = await this.IDCTokenSale.decimals();
        assertEquals(actualDecinalUints, decimalUints, "wrong decimals");

        let creatorTokens = await this.IDCTokenSale.balanceOf(accounts[0]).valueOf();
        assertEquals(creatorTokens, totalSupply, "wrong amount of tokens of creator");

        let actualStartTime = await this.IDCTokenSale.startTime();
        assertEquals(actualStartTime, startTime, "wrong startTime");

        let actualEndTime = await this.IDCTokenSale.endTime();
        assertEquals(actualEndTime, endTime, "wrong endTime");

        let acutalRate = await this.IDCTokenSale.rate();
        assertEquals(acutalRate, rate, "wrong rate");

        let actualCapPerAddress = await this.IDCTokenSale.capPerAddress();
        assertEquals(actualCapPerAddress, capPerAddress, "wrong cap of per address in white list");

        let acutalWallet = await this.IDCTokenSale.wallet();
        assert.equal(acutalWallet, accounts[3], "wrong wallet");
    });

    it("should allow to pause by owner", async function () {
        await this.IDCTokenSale.pause();
        let paused = await this.IDCTokenSale.paused();
        assert.equal(paused, true);
    });

    it("should allow to unpause by owner", async function () {
        await this.IDCTokenSale.pause();
        await this.IDCTokenSale.unpause();
        let paused = await this.IDCTokenSale.paused();
        assert.equal(paused, false);
    });

    it("should not allow to pause by not owner", async function() {
        try {
            await this.IDCTokenSale.pause({from: accounts[1]});
        } catch (error) {
            return;
        }

        // for private network
        const actualState = await this.IDCTokenSale.paused();
        assert.equal(actualState, false, "contract can not be paused by not owner");
    });

    it("should not allow to unpause by not owner", async function() {
        await this.IDCTokenSale.pause();
        try {
            await this.IDCTokenSale.unpause({from: accounts[1]});
        } catch (error) {
            return;
        }

        // for private network
        const actualState = await this.IDCTokenSale.paused();
        assert.equal(actualState, true, "contract can not be unpause by not owner");
    });

    it("should allow to change ownership by owner", async function () {
        await this.IDCTokenSale.transferOwnership(accounts[1]);
        await this.IDCTokenSale.pause({from: accounts[1]});
        let paused = await this.IDCTokenSale.paused();
        assert.equal(paused, true);
    });

    it("should allow to mint by owner(can mint), and totalSupply be right added", async function() {

        let oriTokens = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();

        let success = await this.IDCTokenSale.mint(accounts[1], 10 * 10 ** 18);
        assert(success, true, "mint tokens failed");

        let nowTokens = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(nowTokens.sub(oriTokens), new BigNumber(10 * 10 ** 18), "wrong mint token amount");

        // check totalSupply be right added
        let acutalSupply = await this.IDCTokenSale.totalSupply();
        assertEquals(new BigNumber(acutalSupply), totalSupply.add(10 * 10 ** 18), "wrong totalSupply");
    });

    it("should not allow to mint by not owner(can mint)", async function () {
        try {
            await this.IDCTokenSale.mint(accounts[1], 10 * 10 ** 18, {from: accounts[1]});
        } catch (error) {
            return;
        }

        // for private network
        let tokensOfMint = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(tokensOfMint, new BigNumber(0), "can not mint by not owner");
    });

    it("should not allow to mint by anyone(when finish mint)", async function () {
        let finishMint = await this.IDCTokenSale.finishMinting();
        assert(finishMint, true, "finish minting failed");

        try {
            await this.IDCTokenSale.mint(accounts[1], 10 * 10 ** 18);
        } catch (error) {
            return;
        }

        // for private network
        let tokensOfMint = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(tokensOfMint, new BigNumber(0), "can not mint by anyone when finish minting");
    });

    it("should send tokens to purchaser in white list and sent eth(less than 10) to collect walllet", async function() {

        await increaseTimeTo(afterStartTime);
        await this.IDCTokenSale.addWhiteList(accounts[1]);

        // for private network test
        let timeNow = await this.IDCTokenSale.timeNow();
        while (timeNow < startTime) {
            timeNow = await this.IDCTokenSale.timeNow();
        }

        let sendEther = 1;
        const wallet = accounts[3];
        let pre = web3.eth.getBalance(wallet);

        await this.IDCTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});

        let tokenBalance = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        let sellTokens = new BigNumber(sendEther * rate * 10 ** 18);

        assertEquals(tokenBalance, sellTokens, "send wrong amount tokens to buyer");

        // check wallet will right receive ether
        const post = web3.eth.getBalance(wallet);
        assertEquals(new BigNumber(post).sub(pre), new web3.BigNumber(web3.toWei(sendEther, 'ether')), "wallet not receive right amount of ether");

    });

    it("should not allow to purchase tokens when user not in white list", async function () {
        await increaseTimeTo(afterStartTime);

        let sendEther = 1;

        // for private network test
        let timeNow = await this.IDCTokenSale.timeNow();
        while (timeNow < startTime) {
            timeNow = await this.IDCTokenSale.timeNow();
        }

        try {
            await this.IDCTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});
        } catch (error) {
            return;
        }

        // for private network
        let tokensOfMint = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(tokensOfMint, new BigNumber(0), "can not purchase tokens when user not in white list");
    });

    it("should not allow to purchase tokens when amount of eth of tokens bigger than capPerAddress(10)", async function() {
        await increaseTimeTo(afterStartTime);
        await this.IDCTokenSale.addWhiteList(accounts[1]);

        // for private network test
        let timeNow = await this.IDCTokenSale.timeNow();
        while (timeNow < startTime) {
            timeNow = await this.IDCTokenSale.timeNow();
        }

        let sendEther = 10.1;
        try {
            await this.IDCTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});
        } catch (error) {
            return;
        }

        // for private network
        let tokensOfMint = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(tokensOfMint, new BigNumber(0), "user can not buy tokens when tokens of user want to buy bigger than cap limit");
    });
    
    it("should not allow to purchase tokens when user have buy tokens greater than cap per address(in case send idc to others, then buy tokens again)", async function () {
        await increaseTimeTo(afterStartTime);
        await this.IDCTokenSale.addWhiteList(accounts[1]);

        // for private network test
        let timeNow = await this.IDCTokenSale.timeNow();
        while (timeNow < startTime) {
            timeNow = await this.IDCTokenSale.timeNow();
        }

        let sendEther = 10;
        await this.IDCTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});

        let transferEth = 2;
        await this.IDCTokenSale.transfer(accounts[2], transferEth * rate * 10 ** 18, {from: accounts[1]});

        let afSendEther = 0.1;
        try {
            await this.IDCTokenSale.sendTransaction({value: web3.toWei(afSendEther, "ether"), from: accounts[1]});
        } catch (error) {
            return;
        }

        // for private network
        let tokensOfMint = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(tokensOfMint, new BigNumber(8 * rate * 10 ** 18), "user can not buy more tokens when tokens of user has buyed equal with cap limit");
    });

    it("should normal transfer tokens from account 0 to 1", async function () {

        await increaseTimeTo(afterStartTime);

        let sendEther = 10;
        await this.IDCTokenSale.transfer(accounts[1], sendEther * rate * 10 ** 18, {from: accounts[0]});

        let tokens = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(tokens, new BigNumber(sendEther * rate *  10 ** 18), "transfer token wrong");
    });

    it("should allow to transfer from account 0 to 1(when approve)", async function() {

        // increate time to start ico
        await increaseTimeTo(afterStartTime);

        let sendEther = 10;

        let beforeTokens0 = await this.IDCTokenSale.balanceOf(accounts[0]).valueOf();
        let beforeTokens1 = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();

        await this.IDCTokenSale.approve(accounts[1], sendEther * rate * 10 ** 18, {from: accounts[0]});
        let allowTokens = await this.IDCTokenSale.allowance(accounts[0], accounts[1]);
        assert.equal(allowTokens, sendEther * rate * 10 ** 18, "approve wrong");

        await this.IDCTokenSale.transferFrom(accounts[0], accounts[1], sendEther * rate * 10 ** 18, {from: accounts[1]});

        let afterTokens0 = await this.IDCTokenSale.balanceOf(accounts[0]).valueOf();
        let afterTokens1 = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();

        let transferTokens0 = new BigNumber(beforeTokens0).sub(new BigNumber(afterTokens0));
        let transferTokens1 = new BigNumber(afterTokens1).sub(new BigNumber(beforeTokens1));

        assertEquals(transferTokens0, new BigNumber(sendEther * rate * 10 ** 18), "account0: transfer from account 0 to 1 wrong");
        assertEquals(transferTokens1, new BigNumber(sendEther * rate * 10 ** 18), "account1: transfer from account 0 to 1 wrong");
    });

    it("should not allow to transfer from account 0 to 1(when not approve)", async function () {

        await increaseTimeTo(afterStartTime);
        let pre = await this.IDCTokenSale.balanceOf(accounts[0]).valueOf();

        let sendEther = 10;
        try {
            await this.IDCTokenSale.transferFrom(accounts[0], accounts[1], sendEther * rate * 10 ** 18);
        } catch (error) {
            return;
        }

        let after = await this.IDCTokenSale.balanceOf(accounts[0]).valueOf();
        assertEquals(pre, after, "amount of account 0 should equal");
    });

    it("should not allow to purchase tokens when ico not start", async function () {
        let sendEther = 10;

        let pre = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();

        try {
            await this.IDCTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});
        } catch (error) {
            return;
        }

        let after = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(pre, after, "amount of account 1 should equal");
    });

    it("should not allow to purchase tokens when ico is over", async function () {
        let sendEther = 10;

        await increaseTimeTo(afterEndTime);
        await this.IDCTokenSale.addWhiteList(accounts[1]);

        // for private network, it's hard to wait to end, so this may not work in private network

        try {
            await this.IDCTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});
        } catch (error) {
            return;
        }

        // for private network (may not work)
        let tokensOfMint = await this.IDCTokenSale.balanceOf(accounts[1]).valueOf();
        assertEquals(tokensOfMint, new BigNumber(0), "user can not buy more tokens when tokens of user has buyed equal with cap limit");
    });

    it("one can burn his/her tokens", async function () {
        await increaseTimeTo(afterStartTime);
        await this.IDCTokenSale.addWhiteList(accounts[1]);

        let pre = await this.IDCTokenSale.balanceOf(accounts[0]).valueOf();
        let preTotal = await this.IDCTokenSale.totalSupply();

        let burnAmount = decimalAmount.mul(1000);
        await this.IDCTokenSale.burn(burnAmount, {from: accounts[0]});

        let after = await this.IDCTokenSale.balanceOf(accounts[0]).valueOf();
        let afterTotal = await this.IDCTokenSale.totalSupply();

        let actualBurnAmount = new BigNumber(pre).sub(new BigNumber(after));
        let acutalBurnTotal = preTotal.sub(afterTotal);

        assertEquals(burnAmount, actualBurnAmount, "burn amount not equals");
        assertEquals(burnAmount, acutalBurnTotal, "burn amount not equals");
    });

});