function isString(variable){
    if(typeof variable === 'string' || variable instanceof String){
        return true;
    }
    return false;
}

export default class ClientConfig{
    constructor({ serverURL, redirectURI, clientId, scopes }){
        this.setServerURL(serverURL);
        this.setRedirectURI(redirectURI);
        this.setClientId(clientId);
        this.setScopes(scopes);
    }

    setServerURL(serverURL){
        if(!serverURL){
            throw Error("You must provide serverURL in OctoAuthClient configuration.");
        }else if(!isString(serverURL)){
            throw Error("Argument 'serverURL' in OctoAuthClient configuration must be a valid String.")
        }
        this.serverURL = serverURL;
    }

    setRedirectURI(redirectURI){
        if(!redirectURI){
            throw Error("You must provide redirectURI in OctoAuthClient configuration.");
        }else if(!isString(redirectURI)){
            throw Error("Argument 'redirectURI' in OctoAuthClient configuration must be a valid String.")
        }
        this.redirectURI = redirectURI;
    }

    setClientId(clientId){
        if(!clientId){
            throw Error("You must provide clientId in OctoAuthClient configuration.");
        }else if(!isString(clientId)){
            throw Error("Argument 'clientId' in OctoAuthClient configuration must be a valid String.")
        }
        this.clientId = clientId;
    }

    setScopes(scopes){
        if(!scopes){
            throw Error("You must provide a list of 'scopes' in OctoAuthClient configuration.");
        }else if(!Array.isArray(scopes)){
            throw Error("Argument 'scopes' in OctoAuthClient configuration must be a valid Array.");
        }
        this.scopes = scopes;
        this.scope = scopes.join(',');
    }
}
