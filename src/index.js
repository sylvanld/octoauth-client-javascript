import {generateCodeChallenge, generateCodeVerifier, randomString} from './security'
import {HTTPSession} from './requests'

const CODE_VERIFIER_KEY = "codeVerifier";
const SAVED_STATE_KEY = "savedState";

function parseAuthorizationResponse(){
    const queryString = window.location.search.substr(1);
    const params = {}
    queryString.split("&").map(item=>{
        const [key, value] = item.split('='); 
        params[key] = value;
    });
    window.history.pushState("authorized", "Authorized", window.location.pathname);
    return params;
}

export default class OctoAuthClient{
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

    promptAuthorizationCode(){
        const codeVerifier = this.getCodeVerifier();
        const state = randomString(50);

        // store confidentials information locally before redirection
        localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
        localStorage.setItem(SAVED_STATE_KEY, state);

        generateCodeChallenge(codeVerifier)
        .then(codeChallenge=>{
            // once code challenge is generated, redirect to 
            window.location.href = this.serverURL + "/authorize?"
                + `&response_type=code`
                + `&state=${state}`
                + `&client_id=${this.clientId}`
                + `&redirect_uri=${this.redirectURI}`
                + `&scope=${this.scopes.join(',')}`
                + `&code_challenge=${codeChallenge}`
                + `&code_challenge_method=S256`
        })
    }

    getAuthorizationCode(){
        // this.promptAuthorizationCode();
        const params = parseAuthorizationResponse();
        if(!params.code || !params.state){
            this.promptAuthorizationCode();
        }
        if(params.state != localStorage.getItem(SAVED_STATE_KEY)){
            throw Error("Saved state does not matches returned state...")
        }
        return params.code;
    }

    async introspectToken(accessToken){
        const session = new HTTPSession({baseURL: this.serverURL});
        const response = await session.get({
            url: "/oauth2/token/introspect", 
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        return response.json();
    }

    async getTokenFromCode(authorizationCode){
        const session = new HTTPSession({baseURL: this.serverURL});
        const response = await session.post({
            url: "/oauth2/token", 
            json: {
                grant_type: "authorization_code",
                code: authorizationCode,
                client_id: this.clientId,
                redirect_uri: this.redirectURI
            }
        });
        return response.json().access_token;
    }

    async getAccessToken(){
        const authorizationCode = this.getAuthorizationCode();
        const accessToken = await this.getTokenFromCode(authorizationCode);
        await this.introspectToken(accessToken);
        return accessToken;
    }
}
