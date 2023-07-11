const { assert, expect } = require("chai")
const { getNamedAccounts, network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Club NFT Unit Tests", function () {
          let clubNft, deployer, vrfCoordinatorV2Mock

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "clubnft"])
              clubNft = await ethers.getContract("ClubNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          describe("constructor", () => {
              it("sets starting values correctly", async function () {
                  const clubTokenUriZero = await clubNft.getClubTokenUris(0)
                  const isInitialized = await clubNft.getInitialized()
                  assert(clubTokenUriZero.includes("ipfs://"))
                  assert.equal(isInitialized, true)
              })
          })

          describe("requestNft", () => {
              it("fails if payment isn't sent with the request", async function () {
                  await expect(clubNft.requestNft()).to.be.revertedWith("ClubNft__NeedMoreETHSent")
              })
              it("reverts if payment amount is less than the mint fee", async function () {
                  const fee = await clubNft.getMintFee()
                  await expect(
                      clubNft.requestNft({
                          value: fee.sub(ethers.utils.parseEther("0.001")),
                      })
                  ).to.be.revertedWith("ClubNft__NeedMoreETHSent")
              })
              it("emits an event and kicks off a random word request", async function () {
                  const fee = await clubNft.getMintFee()
                  await expect(clubNft.requestNft({ value: fee.toString() })).to.emit(
                      clubNft,
                      "NftRequested"
                  )
              })
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      clubNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await clubNft.tokenURI("0")
                              const tokenCounter = await clubNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const fee = await clubNft.getMintFee()
                          const requestNftResponse = await clubNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              clubNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
          describe("getBreedFromModdedRng", () => {
              it("should return HAJDUK if moddedRng < 10", async function () {
                  const expectedValue = await clubNft.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return DINAMO if moddedRng is between 10 - 39", async function () {
                  const expectedValue = await clubNft.getBreedFromModdedRng(22)
                  assert.equal(1, expectedValue)
              })
              it("should return RIJEKA or OSIJEK if moddedRng is between 40 - 99", async function () {
                  const expectedValue = await clubNft.getBreedFromModdedRng(74)
                  let R_O = 2 || 3
                  assert.equal(R_O, expectedValue)
              })
              it("should revert if moddedRng > 99", async function () {
                  await expect(clubNft.getBreedFromModdedRng(112)).to.be.revertedWith(
                      "ClubNft__RangeOutOfBounds"
                  )
              })
          })
      })
