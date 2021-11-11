const ACCESS_TOKEN = "accessToken";
const ACCESS_TOKEN_EXPIRES = "accessTokenExpiration";
const CODE_VERIFIER = "codeVerifier";
const REFRESH_TOKEN = "refreshToken";
const STATE = "state";


export default class LocalStorage{
    storeState(state){
        localStorage.setItem(STATE, state);
    }

    loadState(){
        return localStorage.getItem(STATE);
    }

    clearState(){
        localStorage.removeItem(STATE);
    }

    storeGrant(grant){
        localStorage.setItem(ACCESS_TOKEN, grant.access_token);
        localStorage.setItem(REFRESH_TOKEN, grant.refresh_token);
        localStorage.setItem(ACCESS_TOKEN_EXPIRES, (new Date()).getTime() + grant.expires_in*1000);
    }

    loadGrant(){
        const grant = {
            access_token: localStorage.getItem(ACCESS_TOKEN),
            refresh_token: localStorage.getItem(REFRESH_TOKEN),
        };
        if(!grant.access_token){
            return null;
        }
        grant.expires_in = (localStorage.getItem(ACCESS_TOKEN_EXPIRES) - (new Date()).getTime()) / 1000;
        return grant;
    }

    clearGrant(){
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        localStorage.removeItem(ACCESS_TOKEN_EXPIRES);
    }

    storeCodeVerifier(codeVerifier){
        localStorage.setItem(CODE_VERIFIER, codeVerifier);
    }

    loadCodeVerifier(){
        return localStorage.getItem(CODE_VERIFIER);
    }

    clearCodeVerifier(){
        localStorage.removeItem(CODE_VERIFIER);
    }
}