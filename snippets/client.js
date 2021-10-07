const DIGITS = "0123456789";
const UPPERCASE_LETTERS = "ABCDEFGHIJKLMONPQRSTUVWXYZ";
const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const SPECIALS_CHARACTERS = "-._~";

const UNRESERVED_CHARACTERS = DIGITS + UPPERCASE_LETTERS + LOWERCASE_LETTERS + SPECIALS_CHARACTERS;


function getCrypto(){
    let crypto = window.crypto || window.msCrypto;
    if(!crypto){
        throw Error("Your browser does not seems to support crypto objects.");
    }
    return crypto;
}

function generateCodeVerifier(){
    // create a 32-octet sequence of numbers of size 64.
    const array = new Uint32Array(64);
    getCrypto().getRandomValues(array);
    // generate a string by picking characters from UNRESERVED_CHARACTERS based on random numbers
    return Array.from(array, n=>UNRESERVED_CHARACTERS[n % UNRESERVED_CHARACTERS.length]).join("");
}

async function sha256(plainText){
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(plainText);                    

    // hash the plainText
    const hashBuffer = await getCrypto().subtle.digest('SHA-256', msgBuffer);

    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // convert bytes to hex string                  
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function generateCodeChallenge(codeVerifier){
    const hash = await sha256(codeVerifier);
    console.log(hash);
    return btoa(hash);
}

/**
 * Main
 */
(function(){
    const codeVerifier = generateCodeVerifier();
    generateCodeChallenge(codeVerifier)
    .then(codeChallenge=>{
        console.log("codeVerifier", codeVerifier);
        console.log("codeChallenge", codeChallenge);
    })
})()