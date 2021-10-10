
function buildQueryString(data){
    return Object.keys(data).map(key=>[key, data[key]].join('='))
}

function mergeHeaders(headers1, headers2){
    const headers = {};
    if(headers1){
        Object.keys(headers1).forEach(key=>{
            headers[key] = headers1[key];
        })
    }
    if(headers2){
        Object.keys(headers2).forEach(key=>{
            headers[key] = headers2[key];
        })
    }
    return Object.keys(headers).map(key=>({name: key, value: headers[key]}));
}

class HTTPResponse{
    constructor(xhr){
        this.xhr = xhr;
    }

    json(){
        return JSON.parse(this.xhr.responseText);
    }
}

export class HTTPSession{
    constructor({baseURL, headers}){
        this.headers = (!headers) ? {} : headers;
        this.baseURL = (!baseURL) ? null : baseURL;
    }

    request({method, url, headers, json, data, text}){
        if(!!json + !!data + !!text > 1){
            throw Error("Only one of json/data/text might be specified.");
        }
        return new Promise(resolve=>{
            const xhr = new XMLHttpRequest();
            
            if(url.substr(0, 4) != "http" && !!this.baseURL){
                url = this.baseURL + url;
            }
            xhr.open(method, url);

            // set request default headers
            for(let header of mergeHeaders(this.headers, headers)){
                xhr.setRequestHeader(header.name, header.value);
            }

            // build xhr body
            let body = null;
            console.log(json, text, data);
            if(json){
                console.log('json');
                body = JSON.stringify(json);
                xhr.setRequestHeader("Content-Type", "application/json");
            }else if(text){
                body = text;
                xhr.setRequestHeader("Content-Type", "text/plain");
            }else if(data){
                body = buildQueryString(data);
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            }
            xhr.onreadystatechange = function(){
                if(xhr.readyState == 4) {
                    resolve(new HTTPResponse(xhr));
                }
            }
            xhr.send(body);
        })
    }

    get({url, headers}){
        return this.request({method: "GET", url, headers});
    }

    post({url, headers, json, data, text}){
        return this.request({method: "POST", url, headers, json, data, text});
    }

    put({url, headers, json, data, text}){
        return this.request({method: "PUT", url, headers, json, data, text});
    }

    delete({url, headers}){
        return this.request({method: "DELETE", url, headers});
    }
}
