import {generateCodeChallenge, generateCodeVerifier, randomString} from './security'

const CODE_VERIFIER_KEY = "codeVerifier";

module.exports = class OctoAuthClient{
    constructor({clientId, redirectURI, scopes, serverURL}){
        this.clientId = clientId;
        this.redirectURI = redirectURI;
        this.scopes = (!scopes) ? [] : scopes;
        this.serverURL = serverURL;
    }

    getCodeVerifier(){
        let codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
        if(!codeVerifier){
            codeVerifier = generateCodeVerifier();
        }
        return codeVerifier;
    }

    getAuthorizationCode(){
        const codeVerifier = this.getCodeVerifier();
        const state = randomString(50);

        // store confidentials information locally before redirection
        localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
        localStorage.setItem("state", state);

        generateCodeChallenge(codeVerifier)
        .then(codeChallenge=>{
            // once code challenge is generated, redirect to 
            window.location.href = this.serverURL + "?" + 
                + `&response_type=code`
                + `&state=${state}`;
                + `&client_id=${this.clientId}`
                + `&redirect_uri=${this.redirectURI}`
                + `&scope=${this.scopes.join(',')}`
                + `&code_challenge=${codeChallenge}`
                + `&code_challenge_method=S256`
        })
    }
}
