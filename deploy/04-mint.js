const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const clubNft = await ethers.getContract("ClubNft", deployer)
    //we need mint fee
    const mintFee = await clubNft.getMintFee()
    const clubNftMintTx = await clubNft.requestNft({ value: mintFee.toString() })
    const clubNftMintTxReceipt = await clubNftMintTx.wait(1)
    // Need to listen for response
    await new Promise(async (resolve, reject) => {
        setTimeout(() => reject("Timeout: 'NFTMinted' event did not fire"), 300000) // 5 minute timeout time
        // setup listener for our event
        //one we get our NFT minted ,we are going to run an async function
        clubNft.once("NftMinted", async () => {
            console.log(`Club NFT index 0 tokenURI: ${await clubNft.tokenURI(0)}`)
            resolve()
        })
        if (developmentChains.includes(network.name)) {
            const requestId = clubNftMintTxReceipt.events[1].args.requestId.toString()
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, clubNft.address)
        }
    })
}
module.exports.tags = ["all", "mint"]
