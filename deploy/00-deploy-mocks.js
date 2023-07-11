const { network } = require("hardhat")
const { DECIMALS, INITIAL_PRICE } = require("../helper-hardhat-config")

//base fee we can check in chainlink docs,for each request need 0.25link
const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium
//const BASE_FEE = "250000000000000000"

//calculated value based on the gas price of the chain
//They price of request change based on the price of gas
const GAS_PRICE_LINK = 1e9 //Link per gas

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    // If we are on a local development network, we need to deploy mocks!
    if (chainId == 31337) {
        log("Local network detected! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        await deploy("MockV3Aggregator", {
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        })

        log("Mocks Deployed!")
        log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    }
}
module.exports.tags = ["all", "mocks", "main"]
