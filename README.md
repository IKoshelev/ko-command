 
# Knockout JS command pattern implementation (command object and binding). 

The project came about because several existing implementations of kommand pattern 
for Knockout either did not have the functionality our project needed or were not properly
covered with tests.

### ko.command object
The tests document the api quite will. In short, here it is:

```javascript
        var counter = 0;
        //you can just pass a function if you dont need canExecute condition    
        var com = ko.command(function ($data, $event) {
            counter += 1;
            return counter * 10;
        });
        var ret;
        ret = com();  //can still execute as function
        console.log(counter)    //1
        console.log(ret);       //10
        ret = com.execute();  //has a method .execute
        console.log(counter);   //2
        console.log(ret);       //20
```

```javascript
        //you can pass an object with execute function and canExecute function    
        var com = ko.command({
            execute: function ($data, $event) {
                
            }, 
            canExecute:function(){  //optional
                return false;
            }
        });
        console.log(com.canExecute());  //false       
```
canExecute function will be wrapped in a computed, and will update canExecute observable 
property on the resulting object. Since knockout observables are functions, you can just
pass that as canExecute.

It can also handle promises:

```javascript  
        var com = ko.command({
            execute: function ($data, $event) {
                
            }, 
            canExecute:function(){  //can return a promise, whose result will be used
                return Q({})	
                        .delay(2000)
                        .then(function(){
                            return true;
                        });
            }
        });
        console.log(com.canExecute());  //false
        com.canExecute.subscribe(function(newState){
            console.log(newState);
        });  // will become true after 2 seconds
```
Here is more realistic example of using canExecute, showcasing both its computed nature and promise handling
```javascript
        var serviceCallLastResult = ko.observable();

        // command should not be available while there is an outgoing call 
        var com = ko.command({
            execute: function ($data, $event) {
                
            }, 
            canExecute:function(){  //can return a promise, whose result will be used
                var promise = serviceCallLastResult();

                if(!promise){
                    return true;
                }

                return promise.then(function(){
                    return true;
                });
            }
        });

        console.log(com.canExecute());                  //true, no outgoing call in progress

        //serviceCallLastResult(service.someCall());    
        serviceCallLastResult(Q({}).delay(2000));       //simulate an outgoing call

        console.log(com.canExecute());                  //false, outgoing call in progress
        com.canExecute.subscribe(function(newState){
            console.log(newState);
        });  // will become true after 2 seconds i.e. once another call has finished
```

There is also functionality to indicate if an async command is in progress via promise return.
```javascript
        var com = ko.command({
            execute: function ($data, $event) {
                return Q({}).delay(2000);    
            }
        });

        console.log(com.isExecuting()); // false
        com.execute();
        console.log(com.isExecuting()); // true
        com.isExecuting.subscribe(function(newState){
            console.log(newState);
        }); // finished in 2 secconds.
```

###command binding
You can use command binding with the command object
```html
    <button data-bind="command: myCommand">execute</button>
    <a data-bind="command: myCommand">execute</a>
```
It will trigger command on click event. It will disable the button while the comannd is executing, if
a promise is returned to track that. It will be disabled based on canExecute function if one is passed.
*<a> links can't be disabled, but the command will still not be triggered if canExecute or isExecuting 
forbids it.

You can choose to trigger command on enter key
```html
    <input type="text" data-bind="command: myCommand, commandExecuteOnEnter: true"></input>
```

or ony other set of events
```html
    <input type="text" data-bind="command: myCommand, commandExecuteOnEvents: ['blur']"></input>
```
