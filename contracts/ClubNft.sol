//SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "hardhat/console.sol";

error ClubNft__AlreadyInitialized();
error ClubNft__NeedMoreETHSent();
error ClubNft__RangeOutOfBounds();
error ClubNft__TransferFailed();

pragma solidity ^0.8.8;

contract ClubNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    // when we mint NFT, we will trigger a Chainlin VRF call to get us a random number
    // using that number , we will get a random NFT
    // 4 type - super rare(HAJDUK),sort of rare(DINAMO) and common(RIJEKA,OSIJEK)

    //User have to pay to mint an NFT
    // Owner of the contract can withdraw the ETH

    //Type Declaration
    enum Breed {
        HAJDUK,
        DINAMO,
        RIJEKA,
        OSIJEK
    }

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF Helper
    mapping(uint256 => address) public s_requestIdToSender;

    // NFT Variable
    uint256 private s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    //List of ipfs which should be uploaded
    string[] internal s_clubTokenUris;
    uint256 internal immutable i_mintFee;
    bool private s_initialized;

    // Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed breed, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint32 callbackGasLimit,
        string[4] memory clubTokenUris,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Club NFT", "CN") {
        //ERC721("name", "symbol")
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_mintFee = mintFee;
        s_clubTokenUris = clubTokenUris;

        _initializeContract(clubTokenUris);
        s_tokenCounter = 0;
    }

    //for kick off chainlink VRF
    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert ClubNft__NeedMoreETHSent();
        }
        // we are requesting random NFT here
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        //club owner will be sender who requested Nft,not chainlink node
        address clubOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;
        s_tokenCounter = s_tokenCounter + 1;
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        //we have numbers 0-99
        //0-9 -> HAJDUK
        //10-29 -> DINAMO
        //30-99 -> RIJEKA,OSIJEK

        Breed clubBreed = getBreedFromModdedRng(moddedRng);

        _safeMint(clubOwner, newTokenId);
        //This will set tokenUri for us
        _setTokenURI(newTokenId, s_clubTokenUris[uint256(clubBreed)]); //cast Breed to uint to get index
        emit NftMinted(clubBreed, clubOwner);
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        //moddedRng = 25
        //i = 1
        //cumulativeSum = 10
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum += chanceArray[i];
        }
        revert ClubNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        // to represent different chances of the different club
        return [10, 30, MAX_CHANCE_VALUE];
        //index 0 has a 10 % chance,index 1 has 20 ,index 2 has 60
    }

    function _initializeContract(string[4] memory clubTokenUris) private {
        if (s_initialized) {
            revert ClubNft__AlreadyInitialized();
        }
        s_clubTokenUris = clubTokenUris;
        s_initialized = true;
    }

    /*
  //We dont need this bcz ERC721URIStorage wil set for us
    function tokenURI(uint256) public view override returns(string memory) {}
    
*/

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert ClubNft__TransferFailed();
        }
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getClubTokenUris(uint256 index) public view returns (string memory) {
        return s_clubTokenUris[index];
    }

    function getInitialized() public view returns (bool) {
        return s_initialized;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
