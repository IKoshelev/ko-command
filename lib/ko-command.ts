interface KnockoutStatic {
	command<TData,TEvent, TResult>(
		options: commandFunction<TData,TEvent, TResult> | commandOptions<TData,TEvent, TResult>): 
		command<TData,TEvent, TResult>
}

interface command<TData,TEvent, TResult> extends commandFunction<TData,TEvent, TResult> {
	isExectuting: KnockoutObservable<boolean>,
	canExecute: KnockoutObservable<boolean>,
	canExecuteRaw: KnockoutComputed<result<boolean>>
	execute:(data?: TData, event?: TEvent) => result<TResult>
}

interface commandFunction<TData,TEvent, TResult> extends Function{
	(data?: TData, event?: TEvent):result<TResult>
}

interface commandOptions<TData,TEvent, TResult> {
	canExecute?: () => result<boolean>,
	execute: (data?: TData, event?: TEvent) => result<TResult>
}

type result<T> = T | Q.Promise<T>;

(function(window:Window){
	
	function normaliseOptions<TData,TEvent, TResult>(
		optionsOrFunc: commandFunction<TData,TEvent, TResult> | commandOptions<TData,TEvent, TResult>) {
 
        var options = <commandOptions<TData,TEvent, TResult>>{};
    
        options.execute = (<commandOptions<TData,TEvent, TResult>>optionsOrFunc).execute 
							|| <commandFunction<TData,TEvent, TResult>>optionsOrFunc;
 
        options.canExecute =  (<commandOptions<TData,TEvent, TResult>>optionsOrFunc).canExecute 
							|| function() { return true; }
 
        return options;
    }
 
    function setIsExecutingToFalse(resultOrResultPromise: result<any>, 
									command: command<any,any,any>) {
 
        if (resultOrResultPromise && resultOrResultPromise["finally"]) {
            resultOrResultPromise["finally"](function () {
                command.isExectuting(false);
            });
            return;
        }
 
        command.isExectuting(false);
    }
 
    function updateCanExecute(resultOrResultPromise : result<boolean>, 
								command: command<any,any,any>) {
 
        if (resultOrResultPromise 
			&& (<Q.Promise<any>>resultOrResultPromise)["finally"]) {
            (<Q.Promise<any>>resultOrResultPromise)["finally"](function () {
                command.isExectuting(false);
            });
            return;
        }
 
        command.isExectuting(false);
    }
 
 
    ko.command = function<TData,TEvent, TResult>(optionsOrFunc: 
					commandFunction<TData,TEvent, TResult> | commandOptions<TData,TEvent, TResult>) {
 
        var options = normaliseOptions(optionsOrFunc);
 
        var command = <command<TData,TEvent, TResult>> function(TData,TEvent) {
            return options.execute.apply(this, arguments);
        };
 
        command.isExectuting = ko.observable(false);
 
        command.execute = function () {
            command.isExectuting(true);
            var resultOrResultPromise = options.execute.apply(this, arguments);
            setIsExecutingToFalse(resultOrResultPromise, command);
            return resultOrResultPromise;
        }
 
        command.canExecute = ko.observable<boolean>();
 
        command.canExecuteRaw = ko.computed<result<boolean>>(options.canExecute);

        command.canExecuteRaw.subscribe(function (resultOrResultPromise) {

            if ((<Q.Promise<boolean>>resultOrResultPromise).then) {
                command.canExecute(false);
                (<Q.Promise<boolean>>resultOrResultPromise).then(function(result) {
                    command.canExecute(result);
                });
                return;
            }
 
            command.canExecute(<boolean>resultOrResultPromise);
        });
		
		command.canExecuteRaw.notifySubscribers(command.canExecuteRaw());
 
        return command;
    };
	

	
})(window);

interface KnockoutBindingHandlers {
	command: KnockoutBindingHandler
}
 
 (function(window:Window){
	 
	 function getCommandExecuteTriggers(element: HTMLElement):Array<string>{
		 var name = element.tagName.toUpperCase(); 
		 if(name == "BUTTON" 
		 	|| name == "A" 
			|| (name == "INPUT" && (<HTMLInputElement>element).type.toUpperCase() == "BUTTON")){
			 return ["click"];
		 }
		 return [];
	 }
	 
 	ko.bindingHandlers.command = {
		init:(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) => { 
			
			var command = <command<any,any,any>>ko.unwrap(valueAccessor)();
			if(!command.execute){
				throw new Error("Command binding requires ko.command");
			}
			
			var combinedDisableComputed = ko.computed(function(){
				return command.canExecute() == false || command.isExectuting();
			});
			combinedDisableComputed.subscribe((state) => (<HTMLButtonElement>element).disabled = !!state);
			(<HTMLButtonElement>element).disabled = (command.canExecute() == false || command.isExectuting());

			var commandExecuteOnEnter = ko.unwrap<boolean>(allBindingsAccessor.get('commandExecuteOnEnter'));
			if(typeof commandExecuteOnEnter == "undefined"){
				commandExecuteOnEnter = false;
			}
			if(commandExecuteOnEnter){
				(<HTMLElement>element).addEventListener("keydown",(event) => {
					if(event.which != 13 || command.canExecute() == false){
						return;
					}
					event.preventDefault();
					command.execute(viewModel, event);
				});
			}
			
			var commandExecuteOnEvents = ko.unwrap<Array<string>>(allBindingsAccessor.get('commandExecuteOnEvents'));
			commandExecuteOnEvents = commandExecuteOnEvents || getCommandExecuteTriggers(element);
			commandExecuteOnEvents.forEach((eventName) => {
				(<HTMLElement>element).addEventListener(eventName, (event) => {
					if(command.canExecute() == false){
						return;
					}
					command.execute(viewModel, event);
				});
			});
			
			if(!commandExecuteOnEnter && commandExecuteOnEvents.length == 0){
				throw new Error("Command has no triggers for execute.");
			}	
		 }
	};
	
})(window);
