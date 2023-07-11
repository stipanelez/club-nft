//All our code uploaded to Pinata will be here
//JSON will be metadata
//Pin will be image

const pinataSDK = require("@pinata/sdk")
const path = require("path")

//for read files
const fs = require("fs")

require("dotenv").config()

const pinataApiKey = process.env.PINATA_API_KEY || ""
const pinataApiSecret = process.env.PINATA_API_SECRET || ""
const pinata = new pinataSDK(pinataApiKey, pinataApiSecret) //To know that we are

async function storeImages(imagesFilePath) {
    //will pass it our image/random NFT file path)
    const fullImagesPath = path.resolve(imagesFilePath)
    const files = fs.readdirSync(fullImagesPath) //to read this files here
    // console.log(files) // for check

    let responses = [] //response from pinata
    //in responses pinFileToIPFS is going to return the hash of the file
    //we need to add that hash to our metadata
    console.log("Uploading to Pinata")

    //creating a read stream

    for (const fileIndex in files) {
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)

        try {
            const response = await pinata.pinFileToIPFS(readableStreamForFile)
            responses.push(response)
        } catch (error) {
            console.log(error)
        }
    }
    //All responses from pushing files
    return { responses, files }
}

async function storeTokenUriMetadata(metadata) {
    try {
        const response = await pinata.pinJSONToIPFS(metadata)
        return response
    } catch (error) {
        console.log(error)
    }
    return null
}

module.exports = { storeImages, storeTokenUriMetadata }
