/**
 * TODO: implement a secured storage if possible
 */
export class LocalStorage{
    get(key){
        return localStorage.getItem(key);
    }

    set(key, value){
        localStorage.setItem(key, value);
    }

    del(key){
        localStorage.removeItem(key);
    }    
}