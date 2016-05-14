(function (window) {
    function normaliseOptions(optionsOrFunc) {
        var options = {};
        options.execute = optionsOrFunc.execute
            || optionsOrFunc;
        options.canExecute = optionsOrFunc.canExecute
            || function () { return true; };
        return options;
    }
    function setIsExecutingToFalse(resultOrResultPromise, command) {
        if (resultOrResultPromise && resultOrResultPromise["finally"]) {
            resultOrResultPromise["finally"](function () {
                command.isExectuting(false);
            });
            return;
        }
        command.isExectuting(false);
    }
    function updateCanExecute(resultOrResultPromise, command) {
        if (resultOrResultPromise
            && resultOrResultPromise["finally"]) {
            resultOrResultPromise["finally"](function () {
                command.isExectuting(false);
            });
            return;
        }
        command.isExectuting(false);
    }
    ko.command = function (optionsOrFunc) {
        var options = normaliseOptions(optionsOrFunc);
        var command = function (TData, TEvent) {
            return options.execute.apply(this, arguments);
        };
        command.isExectuting = ko.observable(false);
        command.execute = function () {
            command.isExectuting(true);
            var resultOrResultPromise = options.execute.apply(this, arguments);
            setIsExecutingToFalse(resultOrResultPromise, command);
            return resultOrResultPromise;
        };
        command.canExecute = ko.observable();
        command.canExecuteRaw = ko.computed(options.canExecute);
        command.canExecuteRaw.subscribe(function (resultOrResultPromise) {
            if (resultOrResultPromise && resultOrResultPromise.then) {
                command.canExecute(false);
                resultOrResultPromise.then(function (result) {
                    command.canExecute(result);
                });
                return;
            }
            command.canExecute(resultOrResultPromise);
        });
        command.canExecuteRaw.notifySubscribers(command.canExecuteRaw());
        return command;
    };
})(window);
(function (window) {
    function getCommandExecuteTriggers(element) {
        var name = element.tagName.toUpperCase();
        if (name == "BUTTON"
            || name == "A"
            || (name == "INPUT" && element.type.toUpperCase() == "BUTTON")) {
            return ["click"];
        }
        return [];
    }
    ko.bindingHandlers.command = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var command = ko.unwrap(valueAccessor)();
            if (!command.execute) {
                throw new Error("Command binding requires ko.command");
            }
            var combinedDisableComputed = ko.computed(function () {
                return command.canExecute() == false || command.isExectuting();
            });
            combinedDisableComputed.subscribe(function (state) { return element.disabled = !!state; });
            element.disabled = (command.canExecute() == false || command.isExectuting());
            var commandExecuteOnEnter = ko.unwrap(allBindingsAccessor.get('commandExecuteOnEnter'));
            if (typeof commandExecuteOnEnter == "undefined") {
                commandExecuteOnEnter = false;
            }
            if (commandExecuteOnEnter) {
                element.addEventListener("keydown", function (event) {
                    if (event.which != 13 || command.canExecute() == false) {
                        return;
                    }
                    event.preventDefault();
                    command.execute(viewModel, event);
                });
            }
            var commandExecuteOnEvents = ko.unwrap(allBindingsAccessor.get('commandExecuteOnEvents'));
            commandExecuteOnEvents = commandExecuteOnEvents || getCommandExecuteTriggers(element);
            commandExecuteOnEvents.forEach(function (eventName) {
                element.addEventListener(eventName, function (event) {
                    if (command.canExecute() == false) {
                        return;
                    }
                    command.execute(viewModel, event);
                });
            });
            if (!commandExecuteOnEnter && commandExecuteOnEvents.length == 0) {
                throw new Error("Command has no triggers for execute.");
            }
        }
    };
})(window);
//# sourceMappingURL=ko-command.js.map