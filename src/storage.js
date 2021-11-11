/**
 * TODO: implement a secured storage if possible
 */
export class LocalStorage{
    get(key){
        const value = localStorage.getItem(key);
        if(!value){
            return null;
        }
        return value;
    }

    set(key, value){
        localStorage.setItem(key, value)
    }

    del(key){
        localStorage.removeItem(key);
    }    
}