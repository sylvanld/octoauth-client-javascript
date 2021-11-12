export default class Observable{
    constructor(initialValue){
        this.value = initialValue;
        this.observers = [];
    }

    /**
     * Change value of the observable and notify observers
     */
    next(newValue){
        console.log('nextCalled', newValue);
        this.value = newValue;
        console.log('notify Obsevers', this.observers);
        this.notifyObservers();
    }

    /**
     * Wait until a value is set on an observer, then returns this value.
     */
    waitValue(){
        return new Promise(resolve=>{
            console.log("waitValue", this.value)
            // immediately returns value if it is set
            if(this.value !== undefined){
                resolve(this.value);
                return;
            }

            // otherwise, register a handler that will resolve promise later, then unregister
            const onValueChange = (newValue)=>{
                console.log("asyncValue", newValue);
                resolve(newValue);
                this.removeObserver(onValueChange);
            }
            this.addObserver(onValueChange);
        });
    }

    /**
     * Call all observers with this observable's value
     */
    notifyObservers(){
        for(let k=this.observers.length-1; k>=0; k--){
            this.observers[k](this.value);
        }
    }
    
    /**
     * Register a function that will notified when observable value change.
     */
    addObserver(observer){
        this.observers.push(observer);
        if(this.value !== undefined){
            observer(this.value);
        }
    }

    /**
     * Unregister an observer function
     */
    removeObserver(observer){
        this.observers.pop(observer);
    }
}