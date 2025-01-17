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

export function generateRandomString(length){
    // create a 32-octet sequence of numbers of given size.
    const array = new Uint32Array(length);
    getCrypto().getRandomValues(array);
    // generate a string by picking characters from UNRESERVED_CHARACTERS based on random numbers
    return Array.from(array, n=>UNRESERVED_CHARACTERS[n % UNRESERVED_CHARACTERS.length]).join("");
}

/**
 * Hash a string using SHA256 hashing algorithm
 */
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

/**
 * Generate code challenge from code verifier.\
 * challenge is computed as: `base64(sha256(codeVerifier))`
 */
export async function generateCodeChallenge(codeVerifier){
    const hash = await sha256(codeVerifier);
    return btoa(hash);
}
