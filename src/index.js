import axios from 'axios'
import { Observable } from './observable'
import { LocalStorage } from './storage'
import { generateCodeChallenge, generateCodeVerifier, randomString } from './security'


const CODE_VERIFIER_KEY = "codeVerifier";
const REFRESH_TOKEN_KEY = "refreshToken";
const SAVED_STATE_KEY = "savedState";


function parseQueryParams() {
    const queryString = window.location.search.substr(1);

    // parse queryString as an object
    const params = {}
    queryString.split("&").map(item => {
        const [key, value] = item.split('=');
        params[key] = value;
    });

    // remove response params from URL
    window.history.pushState("authorized", "Authorized", window.location.pathname);
    return (Object.keys(params).length > 0) ? params : null;
}

function objectToFormData(obj){
    const formData = new FormData();
    Object.keys(obj).forEach(key=>formData.append(key, obj[key]));
    return formData;
}


/**
 * OctoAuth client that can be used to perform Oauth2 flow as a public client.
 */
export default class OctoAuthClient {
    constructor({ clientId, redirectURI, scopes, serverURL }) {
        this.clientId = clientId;
        this.redirectURI = redirectURI;
        this.scopes = (!scopes) ? [] : scopes;
        this.serverURL = serverURL;

        this.accessToken = new Observable();
        this.isAuthorized = new Observable();

        this.session = axios.create({ baseURL: serverURL });
        this.storage = new LocalStorage();
    }

    /**
     * Either load code verifier from storage or generate a new one
     */
    getCodeVerifier() {
        let codeVerifier = this.storage.get(CODE_VERIFIER_KEY);
        if (!codeVerifier) {
            codeVerifier = generateCodeVerifier();
            this.storage.set(CODE_VERIFIER_KEY, codeVerifier);
        }
        return codeVerifier;
    }

    /**
     * Parse response from authorization server in URL
     */
    parseAuthorizationResponse() {
        console.log("parseAuthorizationResponse");
        const queryParams = parseQueryParams();

        const savedState = this.storage.get(SAVED_STATE_KEY);
        this.storage.del(SAVED_STATE_KEY);

        // ensure state matches saved state to accept authorization code
        if (savedState && queryParams && queryParams.state != savedState) {
            console.log("Saved state does not matches returned state...");
            return null;
        }

        console.log('parsed', queryParams);

        return queryParams;
    }

    /**
     * Redirect to authorization server's /authorize view
     */
    redirectToAuthorization() {
        console.log("redirectToAuthorization");
        const codeVerifier = this.getCodeVerifier();
        const state = randomString(50);

        this.storage.set(SAVED_STATE_KEY, state);

        generateCodeChallenge(codeVerifier)
            .then(codeChallenge => {
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

    /**
     * Returns information contained in a token or reject an error if token is invalid/expired.
     */
    introspectToken(accessToken) {
        console.log("introspectToken");
        return new Promise((resolve, reject) => {
            this.session.get("/oauth2/token/introspect", { headers: { 'Authorization': `Bearer ${accessToken}` } })
                .then(response => {
                    if (response.status == 403) {
                        reject("Invalid or expired access token");
                        return;
                    }
                    resolve(response.data);
                })
        })
    }

    /**
     * Either parse code from URL or redirect to /authorize
     */
    getAuthorizationCode() {
        console.log("getAuthorizationCode");
        const params = this.parseAuthorizationResponse();
        if (!params || !params.code) {
            this.redirectToAuthorization();
        }
        return params.code;
    }

    /**
     * Configure session to use access token, store refresh, and set timeout to update token.
     */
    setTokenGrant({ access_token, refresh_token, token_type, expires_in }) {
        console.log("setTokenGrant", { access_token, refresh_token, token_type, expires_in });

        if (!access_token) {
            this.isAuthorized.next(false);
        }

        if (token_type.toLowerCase() == "bearer") {
            this.session.defaults.headers.common['Authorization'] = `${token_type} ${access_token}`;
            this.accessToken.next(access_token);
            this.isAuthorized.next(true);
        } else {
            throw Error("Unsupported token_type received");
        }

        // store refresh token
        this.storage.set(REFRESH_TOKEN_KEY, refresh_token);

        // refresh access token once it expires
        console.log(`access token will be refreshed in ${expires_in} seconds`);
        setTimeout(() => this.getTokenGrantFromRefresh(refresh_token), (expires_in - 10) * 1000);
    }

    async getTokenGrantFromCode(authorizationCode) {
        console.log("getTokenGrantFromCode", authorizationCode);
        const response = await this.session.post(
            "/api/oauth2/token",
            objectToFormData({
                grant_type: "authorization_code",
                code: authorizationCode,
                client_id: this.clientId,
                redirect_uri: this.redirectURI,
                code_verifier: this.storage.get(CODE_VERIFIER_KEY)
            })
        );

        this.storage.del(CODE_VERIFIER_KEY)

        if (response.status != 200) {
            throw Error("An error occured retrieving token from authorization code");
        }

        this.setTokenGrant(response.data);
        return response.data;
    }

    async getTokenGrantFromRefresh(refreshToken) {
        console.log("getTokenGrantFromRefresh", refreshToken);
        const response = await this.session.post(
            "/api/oauth2/token",
            objectToFormData({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: this.clientId,
                redirect_uri: this.redirectURI
            })
        );

        if (response.status != 200) {
            throw Error("An error occured retrieving token from authorization code");
        }
        return response.data;
    }

    async reloadAuthorization() {
        console.log("reloadAuthorization");
        let refreshToken = this.storage.get(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
            this.isAuthorized.next(false);
            return false;
        }
        const tokenGrant = await this.getTokenGrantFromRefresh(refreshToken);
        this.setTokenGrant(tokenGrant);
        return false;
    }

    revokeAuthorization() {
        this.storage.del(REFRESH_TOKEN_KEY);
    }

    /**
     * Bellow are defined methods that are not related to Oauth2 protocol
     */

    /**
     * Get current user account (identified by access token)
     */
    async getCurrentUserAccount() {
        const response = await this.session.get("/api/accounts/whoami");
        if (response.status != 200) {
            throw Error("An unhandled error occured while getting current user account.")
        }
        return response.data;
    }
}