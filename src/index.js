import axios from 'axios';
import ClientConfig from "./config";
import LocalStorage from './storage';
import { generateCodeChallenge, generateRandomString } from './security';


/**
 * Parse a query string in the format user=toto&value=titi
 * @returns \{paramA, paramB, ...}
 */
function parseQueryString(queryString) {
    const params = {}
    queryString.split("&").map(item => {
        const [key, value] = item.split('=');
        params[key] = value;
    });
    return (Object.keys(params).length > 0) ? params : null;
}


function axiosResponseHandler(response) {
    return response.data;
}

function axiosExceptionHandler(error) {
    return Promise.reject(error);
}


class OctoAuthBaseClient {
    constructor({ clientId, redirectURI, scopes, serverURL }) {
        this.config = new ClientConfig({ clientId, redirectURI, scopes, serverURL });
        this.storage = new LocalStorage();
        this.session = axios.create({ baseURL: serverURL });
        this.session.interceptors.response.use(axiosResponseHandler, axiosExceptionHandler);
    }

    /**
     * Redirect user to authorization server's consent screen to retrieve
     * an authorization code with proper scopes.
     */
    authorize() {
        console.log("Redirect to authorization server consent screen.");
        const codeVerifier = generateRandomString(64);
        const state = generateRandomString(25);

        // save state that will be checked after redirection
        this.storage.storeState(state);
        this.storage.storeCodeVerifier(codeVerifier);

        // generate code challenge, then redirect to authorization server consent screen with PKCE
        generateCodeChallenge(codeVerifier)
            .then(codeChallenge => {
                window.location.href = this.config.serverURL + "/authorize?"
                    + `&response_type=code`
                    + `&state=${state}`
                    + `&client_id=${this.config.clientId}`
                    + `&redirect_uri=${this.config.redirectURI}`
                    + `&scope=${this.config.scope}`
                    + `&code_challenge=${codeChallenge}`
                    + `&code_challenge_method=S256`
            })
    }

    /**
     * Handle authorization response from URL query or hash.
     * 
     * If using implicit flow, directly set accessToken.
     * 
     * If using authorization code flow, parse code, and make access token request.
     */
    async handleAuthorizationResponse(force) {
        force = force ? true : false;
        // parse authorization code response
        if (window.location.search.includes("?")) {
            let response = parseQueryString(window.location.search.substr(1));
            if (response.code && response.state) {
                console.log("Valid authorization code retrieved");
                // check that returned state matches state passed in request
                if (response.state != this.storage.loadState()) {
                    throw Error("State in response does not match state passed in authorization request.");
                }
                //this.storage.clearState();
                // 
                const grant = await this.getTokenFromCode(response.code);
                this.configureGrant(grant);
            }
        } else {
            console.log("No authorization response to handle");
            if (force) this.authorize();
        }
    }

    /**
     * Configure client session to use access token.
     * 
     * If a refresh token has been issued, schedule a function to refresh access token once it is expired.
     */
    configureGrant(grant) {
        // store grant so it can be reloaded after browser is closed
        this.storage.storeGrant(grant);
        // configure session to use accessToken as authorization bearer
        this.session.defaults.headers["Authorization"] = `Bearer ${grant.access_token}`;
        // if a refresh token is provided, schedule refresh once access token is expired
        if (grant.refresh_token) {
            setTimeout(this.getTokenFromRefreshToken, grant.expires_in * 1000);
        } else {
            setTimeout(this.authorize, grant.expires_in * 1000);
        }
    }

    /**
     * Request a new token grant from authorization code.
     * 
     * @returns \{access_token, refresh_token, token_type, expires_in, scopes}
     * @throw error if token request is denied or fails
     */
    async getTokenFromCode(authorizationCode) {
        const form = new FormData();
        form.append("grant_type", "authorization_code");
        form.append("code", authorizationCode);
        form.append("client_id", this.config.clientId);
        form.append("redirect_uri", this.config.redirectURI);
        form.append("code_verifier", this.storage.loadCodeVerifier());

        const tokenGrant = await this.session.post("/api/oauth2/token", form);

        // clear code from URL
        window.history.pushState("authenticated", "authenticated", window.location.pathname);

        return tokenGrant;
    }

    /**
     * Request a new token grant using a valid refresh token.
     * 
     * @returns \{access_token, refresh_token, token_type, expires_in, scopes}
     * @throw error if token request is denied or fails
     */
    async getTokenFromRefreshToken(refreshToken) {
        const form = new FormData();
        form.append("grant_type", "refresh_token");
        form.append("refresh_token", refreshToken);
        form.append("client_id", this.config.clientId);
        form.append("redirect_uri", this.config.redirectURI);

        const tokenGrant = await this.session.post("/api/oauth2/token", form);
        return tokenGrant;
    }

    /**
     * Configure session with a valid access token retrieved from storage.
     * If token is expired and a refresh token exists, use refresh token to issue a new access token.
     * 
     * @returns a boolean that indicates whether accessToken has been loaded.
     */
    async reloadGrant() {
        console.log("Reloading grant from storage.");
        let grant = this.storage.loadGrant();
        if (!grant) {
            console.log("No grant loaded.");
            return false;
        }

        console.log('Old grant found', grant);
        if (grant.expires_in > 0) {
            console.log("Valid grant reloaded");
            this.configureGrant(grant);
            return true;
        } else {
            if (!grant.refresh_token) {
                console.log("No grant loaded. Refresh token is expired and no refresh token exists.");
                return false;
            }
            // if token is expired but refresh exists, use refresh to issue a new access token
            grant = await this.getTokenFromRefreshToken(grant.refresh_token);
            this.configureGrant(grant);
            return true;
        }
    }
}

class OctoAuthClient extends OctoAuthBaseClient {
    async whoami() {
        return await this.session.get(`/api/accounts/whoami`);
    }
    async getApplicationDetails(applicationUID) {
        return await this.session.get(`/api/oauth2/applications/${applicationUID}`);
    }
    async searchApplications() {
        return await this.session.get("/api/oauth2/applications");
    }
    async createApplication(application) {
        return await this.session.post("/api/oauth2/applications", application);
    }
    async updateApplication(applicationUID, applicationData) {
        return await this.session.put(`/api/oauth2/applications/${applicationUID}`, applicationData);
    }
    async deleteApplication(applicationUID) {
        return await this.session.delete(`/api/oauth2/applications/${applicationUID}`);
    }
    async getAuthorizedRedirectURIs(applicationUID) {
        return await this.session.get(`/api/oauth2/applications/${applicationUID}/redirect_uris`);
    }
    async updateAuthorizedRedirectURI(applicationUID, redirectUid, redirectURI) {
        return await this.session.put(`/api/oauth2/applications/${applicationUID}/redirect_uris/${redirectUid}`, { redirect_uri: redirectURI });
    }
    async addAuthorizedRedirectURI(applicationUID, redirectURI) {
        return await this.session.post(`/api/oauth2/applications/${applicationUID}/redirect_uris`, { redirect_uri: redirectURI });
    }
    async getSessions() {
        return await this.session.get("/api/sessions");
    }
    async revokeSession(sessionUID) {
        return await this.session.post(`/api/sessions/${sessionUID}/revoke`);
    }
}

export default OctoAuthClient;
