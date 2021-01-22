const checkJSONCorrectness = require("./checkJSONCorrectness")

function handleInterfaces(object, topic, message){

    let topicList = topic.split('/');

    let parsedMessage = checkJSONCorrectness(message, true); // TODO: rozdziel osobno check correctness osbono parse. W funckji parse odpal check correctness

    if(!parsedMessage){
        object.serverLogs("Server received invalid message at topic: " + topic, "warning", true);
        return
    }

    topicList.shift();
    let __interface = parsedMessage["interface"];

    if(topicList[0] === "add"){

            if(object.interfacesConfig[__interface]){
                object.serverLogs("Interface '" + __interface + "' already exists. Remove it or choose different name for the new one.", "warning");
            }
            else{
                let confatr = {
                    preprocessor: parsedMessage["preprocessor"],
                    fine_tuner: parsedMessage["fine_tuner"],
                    classifier: parsedMessage["classifier"]
                }

                object.interfacesConfig[__interface]=confatr;
                object.serverLogs("Newly created interface configuration '" + __interface + "' had been saved.", "success", true);
            }

        object.saveInterfaces();
    }

    else if(topicList[0] === "edit"){
        interfaces.forEach((el, index) => {
            if(!object.interfacesConfig[el]){
                object.serverLogs("Interface configuration '" + el + "' doesn't exist.", "warning");
            }
            else{
                object.interfacesConfig[el]=parsedMessage["attributes"][index];
                object.serverLogs("Freshly updated interface configuration '" + el + "' had been saved.", "success");
            }
            
        })
        object.saveInterfaces();
    }

    else if(topicList[0] === "remove"){
        interfaces.forEach((el) => {
            if(object.interfacesConfig[el]){
                //TODO use method instead
                delete object.interfacesConfig[el];
                object.serverLogs(el + "' interface configuration has been deleted.", "success");
            }
            else{
                object.serverLogs("Interface configuration '" + el + "' doesn't exist.", "warning");
            }
            
        })
        object.saveInterfaces();
    }
    
    else if(topicList[0] === "use"){
        interfaces.forEach((el) => {
            if(!object.isInterfaceOnline(el))
                object.createPipeline(el);
            
            else
                object.serverLogs("Interface " + el + " is already in use.", "warning");
        })
    }

    else if(topicList[0] === "end"){
        let oldInterface = object.getOnlineInterface();
        object.destroyPipeline();
        object.serverLogs("Interface " + oldInterface + " has been finished.", "success", true)
    }
    else{
        object.serverLogs("I dont know this topic.", "warning")
    }
}

module.exports = handleInterfaces;