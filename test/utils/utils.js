const toToken = (value, decimals = 18) => {
    return ethers.utils.parseUnits(value.toString(), decimals);
};

const toWei = (value) => {
    return ethers.utils.parseUnits(value.toString(), "wei");
};

const formatBigNumber = (bigNumber, decimals = 18) => {
    return Number(ethers.utils.formatUnits(bigNumber.toString(), decimals));
};

module.exports = {
    toToken,
    toWei,
    formatBigNumber
}