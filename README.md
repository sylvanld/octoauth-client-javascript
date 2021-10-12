# OctoAuth javascript client

Client library for OctoAuth identity server...

## Installation

```
npm install --save octoauth-client
```


## Description

![pkce-flow-for-public-client.png](docs/images/pkce-flow-for-public-client.png)
*Illustration: implementation of pkce flow for public client*

## Usage

Instanciate OctoAuth client.

```javascript
import {OctoAuthClient} from 'octoauth-client'

const octo = new OctoAuthClient({
    clientId: 'social-network', 
    redirectURI: 'http://social.example.com', 
    scopes: ['friends:read', 'friends:edit'], 
    serverURL: 'https://accounts.example.com'
})
```

Redirect user to authorization server's /authorize view
```javascript
octo.redirectToAuthorization();
```

Handle authorization response (will redirect to authorization if no response is found)
```javascript
const authorizationCode = octo.getAuthorizationCode()
octo.getTokenGrantFromCode(authorizationCode)
    .then(()=>console.log("token grant has been loaded"))
    .error(()=>console.log("failed to get tokenGrant"));
```

Reload authorization from stored `refresh_token`
```javascript
octo.reloadAuthorization()
    .then(()=>console.log("authorization reloaded"))
    .error(()=>console.log("no suitable authorization stored"));
```

Register a function notified on token change
```javascript
octo.accessToken.addObserver(accessToken=>{
    console.log("new access token value", accessToken);
})
```

## Sources

- [proof key for code exchange by oauth public clients (rfc7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [generate cryptographically secure random numbers](https://developer.mozilla.org/en-US/docs/Web/API/crypto_property)

## Roadmap

- Support both implicit flow, and authorization code with PKCE.
