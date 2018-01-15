import org.junit.Test;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.WalletUtils;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.admin.Admin;
import org.web3j.protocol.admin.methods.response.PersonalUnlockAccount;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.*;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.Transfer;
import org.web3j.utils.Convert;
import org.web3j.utils.Numeric;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static junit.framework.Assert.assertEquals;

public class IDCTokenTest {

    // special to your url(default http://localhost:8545)
    private final String url = "http://192.168.1.115:8545";

    //
    String tokenName = "IDC Token";
    String tokenSymbol = "IDC";
    BigInteger decimalUints = new BigInteger("18");
    BigInteger decaimalAmount = new BigInteger("10").pow(18);
    BigInteger sleepTime = new BigInteger("60");
    BigInteger startTime = GetTime().add(sleepTime);
    BigInteger lastingTime = new BigInteger("12000").multiply(new BigInteger("60"));
    BigInteger endTime = startTime.add(lastingTime);
    BigInteger totalSupply = new BigInteger("800000000").multiply(decaimalAmount);
    BigInteger rate = new BigInteger("7000");
    BigInteger capPerAddress = new BigInteger("10").multiply(decaimalAmount);

    BigInteger gasPrice = new BigInteger("0");
    BigInteger gasLimit = new BigInteger("9730456");

    // change to fit format of solidity now(length should be 10)
    public BigInteger GetTime() {
        return BigInteger.valueOf(System.currentTimeMillis()/1000);
    }

    public Web3j GetConnection(String url) {
        if ("".equals(url)) {
            return Web3j.build(new HttpService());
        }
        Web3j web3j = Web3j.build(new HttpService(url));
        return web3j;
    }

    public String DeployContract(Web3j web3j, Credentials credentials) throws Exception {
        IDCToken contract = IDCToken.deploy(
                web3j, credentials, gasPrice, gasLimit, tokenName, tokenSymbol, decimalUints,startTime, endTime, totalSupply, rate, capPerAddress, credentials.getAddress()
        ).send();
        String contractAddress = contract.getContractAddress();
        return contractAddress;
    }

    // default credentials for account 0
    public Credentials GetDefaultCredentials() throws Exception {
        Credentials credentials = WalletUtils.loadCredentials("123", "owner.json");
        return credentials;
    }

    public Credentials GetAccount1() throws Exception {
        Credentials credentials = WalletUtils.loadCredentials("123", "account1.json");
        return credentials;
    }

    public Credentials GetAccount2() throws Exception {
        Credentials credentials = WalletUtils.loadCredentials("123", "account2.json");
        return credentials;
    }

    public IDCToken before(Credentials credentials) throws Exception {
        Web3j web3j = GetConnection(url);
        String contractAddress =  DeployContract(web3j, credentials);
        IDCToken idc = IDCToken.load(contractAddress, web3j, credentials, gasPrice, gasLimit);
        return idc;
    }

    public IDCToken load(String contractAddress, Credentials credentials) throws Exception {
        Web3j web3j = GetConnection(url);
        IDCToken idc = IDCToken.load(contractAddress, web3j, credentials, gasPrice, gasLimit);
        return idc;
    }

    @Test
    public void TestInitialized() throws Exception {

        Credentials credentials = GetDefaultCredentials();
        IDCToken idc = before(credentials);

        // test for initialized
        String actualCreator = idc.creator().send();
        assertEquals(actualCreator, credentials.getAddress());

        String actualTokenName = idc.name().send();
        assertEquals(actualTokenName, tokenName);

        String actualSymbol = idc.symbol().send();
        assertEquals(actualSymbol, tokenSymbol);

        BigInteger actualDecinalUints = idc.decimals().send();
        assertEquals(actualDecinalUints, decimalUints);

        BigInteger initIDC = idc.balanceOf(credentials.getAddress()).send();
        assertEquals(initIDC, totalSupply);

        BigInteger actualStartTime = idc.startTime().send();
        assertEquals(actualStartTime, startTime);

        BigInteger actualEndTime = idc.endTime().send();
        assertEquals(actualEndTime, endTime);

        BigInteger actualRate = idc.rate().send();
        assertEquals(actualRate, rate);

        BigInteger actualCapAddress = idc.capPerAddress().send();
        assertEquals(actualCapAddress, capPerAddress);

        String actualWallet = idc.wallet().send();
        assertEquals(actualWallet, credentials.getAddress());
    }

    @Test
    public void TestPause() throws Exception {

        Credentials credentials = GetDefaultCredentials();
        IDCToken idc = before(credentials);

        // pause tokens
        idc.pause().send();

        boolean acutalState = idc.paused().send();
        assertEquals(acutalState, true);

        // unpause tokens
        idc.unpause().send();

        acutalState = idc.paused().send();
        assertEquals(acutalState, false);

        // can not be changed by not owner
        Credentials credentials1 = GetAccount1();
        IDCToken idc1 = before(credentials1);
    }

    @Test
    public void TestOwner() throws Exception {

        Credentials credentials = GetDefaultCredentials();
        IDCToken idc = before(credentials);

        Credentials newCredentials = GetAccount1();

        idc.transferOwnership(newCredentials.getAddress()).send();
        String newOwner = idc.owner().send();
        assertEquals(newOwner, newCredentials.getAddress());
    }

    @Test
    public void TestMint() throws Exception {

        Credentials credentials = GetDefaultCredentials();
        IDCToken idc = before(credentials);

        Credentials account1 = GetAccount1();
        BigInteger mintIDC = new BigInteger("10").multiply(decaimalAmount);

        BigInteger pre = idc.balanceOf(account1.getAddress()).send();
        idc.mint(account1.getAddress(), mintIDC).send();
        BigInteger after = idc.balanceOf(account1.getAddress()).send();

        assertEquals(after.subtract(pre), mintIDC);

        BigInteger newTotal = idc.totalSupply().send();
        assertEquals(newTotal, totalSupply.add(mintIDC));
    }

    @Test
    public void TestNormalTransfer() throws Exception {
        Credentials credentials = GetDefaultCredentials();
        IDCToken idc = before(credentials);

        Credentials account1 = GetAccount1();

        BigInteger pre = idc.balanceOf(account1.getAddress()).send();


        BigInteger transferIDC = new BigInteger("10").multiply(decaimalAmount);
        TransactionReceipt transactionReceipt = idc.transfer(account1.getAddress(), transferIDC).sendAsync().get();
        String transId = transactionReceipt.getTransactionHash();

        //IDCToken.getTransferEvents(transactionReceipt);

        BigInteger after = idc.balanceOf(account1.getAddress()).send();
        assertEquals(after.subtract(pre), transferIDC);
    }

    @Test
    public void TestBurnTokens() throws Exception {
        Credentials credentials = GetDefaultCredentials();
        IDCToken idc = before(credentials);

        BigInteger pre = idc.balanceOf(credentials.getAddress()).send();
        BigInteger preTotal = idc.totalSupply().send();

        BigInteger burnAmount = new BigInteger("7000").multiply(decaimalAmount);
        idc.burn(burnAmount).send();

        BigInteger after = idc.balanceOf(credentials.getAddress()).send();
        BigInteger afterTotal = idc.totalSupply().send();

        assertEquals(pre.subtract(after), burnAmount);
        assertEquals(preTotal.subtract(afterTotal), burnAmount);
    }

    @Test
    public void TestWhiteList() throws Exception {
        Credentials credentials = GetDefaultCredentials();
        IDCToken idc = before(credentials);

        Credentials acc = GetAccount1();

        idc.addWhiteList(acc.getAddress()).send();



    }

    @Test
    public void TestTransferEth() throws Exception {

        Credentials account1 = GetAccount1();
        Credentials account2 = GetAccount2();

        Web3j web3j = GetConnection(url);

        EthGetBalance ethGetBalance2 = web3j
                .ethGetBalance(account2.getAddress(), DefaultBlockParameterName.LATEST)
                .sendAsync()
                .get();

        BigInteger preAccount2 = ethGetBalance2.getBalance();

        Transfer.sendFunds(
                web3j, account1, account2.getAddress(),
                BigDecimal.valueOf(1.0), Convert.Unit.ETHER)
                .send();
        BigInteger transerAmount = new BigInteger("1").multiply(decaimalAmount);

        EthGetBalance ethGetBalance4 = web3j
                .ethGetBalance(account2.getAddress(), DefaultBlockParameterName.LATEST)
                .sendAsync()
                .get();

        BigInteger afterAccount2 = ethGetBalance4.getBalance();

        // check account2 get right amount eth
        assertEquals(transerAmount, afterAccount2.subtract(preAccount2));
    }

    @Test
    public void TestGasPrice() throws Exception {
        String url = "http://192.168.1.102:8545";
        Web3j web3j = GetConnection(url);
        EthGasPrice ethGasPrice = web3j.ethGasPrice().send();
        BigInteger gasPrice = ethGasPrice.getGasPrice();
        System.out.println(gasPrice);
    }

    @Test
    public void TestGetReciption() throws Exception {

        String url = "http://192.168.1.102:8545";

        String contractAddress = "0xdbe16aa3c77ff1bc391f2b311152b86610de1494";

        BigInteger gWei = new BigInteger("1000000000");
        BigInteger gasPrice = new BigInteger("30").multiply(gWei);
        BigInteger gasLimit = new BigInteger("100000");

        String from = "0xde342d474ee94d1212a6498fac134cb28623c324";
        String _to = "0xdbe16aa3c77ff1bc391f2b311152b86610de1494";
        BigInteger _value = new BigInteger("7000").multiply(decaimalAmount);
        String password = "liuruichao123";

        Admin web3jJ = Admin.build(new HttpService(url));
        PersonalUnlockAccount personalUnlockAccount = web3jJ.personalUnlockAccount(from, password).send();
        if (personalUnlockAccount.accountUnlocked()) {
            // send a transaction
            System.out.println("personal account unlock");
        }

        EthGetTransactionCount ethGetTransactionCount = web3jJ.ethGetTransactionCount(from, DefaultBlockParameterName.LATEST).sendAsync().get();

        BigInteger nonce = ethGetTransactionCount.getTransactionCount();

        System.out.println("none is :" + nonce);

        Function function = new Function(
                "transfer",
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(_to),
                        new org.web3j.abi.datatypes.generated.Uint256(_value)),
                Collections.<TypeReference<?>>emptyList());
        String encodedFunction = FunctionEncoder.encode(function);

        Double a = 1.1;
        new BigInteger(a.toString());

        Transaction transaction = Transaction.createFunctionCallTransaction(
                from, nonce, gasPrice, gasLimit, contractAddress, new BigInteger("0"), encodedFunction);
        EthSendTransaction ethSendTransaction = web3jJ.ethSendTransaction(transaction).send();
        System.out.println(ethSendTransaction);
        String hash = ethSendTransaction.getTransactionHash();

        System.out.println(hash);
    }

    public BigInteger changeToBigInteger(BigDecimal value) {

        //BigInteger
        BigDecimal weiValue = Convert.toWei(value, Convert.Unit.ETHER);
        if (!Numeric.isIntegerValue(weiValue)) {
            throw new UnsupportedOperationException("Non decimal Wei value provided: " + value + " " + Convert.Unit.ETHER.toString() + " = " + weiValue + " Wei");
        } else {
            return weiValue.toBigIntegerExact().multiply(new BigInteger("7000"));
        }
    }

    @Test
    public void TestDecimal() {
        BigDecimal value = new BigDecimal("1.2");

        BigInteger res = changeToBigInteger(value);
        System.out.println(res);
    }
}
