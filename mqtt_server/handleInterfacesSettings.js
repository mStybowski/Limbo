const validateInterfaceMessage = require("./validateInterfaceMessage")

function handleInterfaces(object, topic, rawMessage){

    if(!validateInterfaceMessage(rawMessage)){
        object.serverLogs("Received invalid message at interfaces/# topic", "warning", true);
        return;
    }

    let parsedMessage = JSON.parse(rawMessage.toString());
    let parsedInterface = parsedMessage["interface"];
    let topicList = topic.split('/');
    topicList.shift();

    if(topicList[0] === "add"){

        let data = parsedMessage.arguments;
        object.addNewInterface(parsedInterface, data);

    }

    else if(topicList[0] === "edit"){
        object.serverLogs("Topic interfaces/edit is not available", "warning");
        // interfaces.forEach((el, index) => {
        //     if(!object.interfacesConfig[el]){
        //         object.serverLogs("Interface configuration '" + el + "' doesn't exist.", "warning");
        //     }
        //     else{
        //         object.interfacesConfig[el]=parsedMessage["attributes"][index];
        //         object.serverLogs("Freshly updated interface configuration '" + el + "' had been saved.", "success");
        //     }
        //
        // })
        // object.saveInterfaces();
    }

    else if(topicList[0] === "remove"){
        object.serverLogs("Topic interfaces/remove is not available", "warning");
        // interfaces.forEach((el) => {
        //     if(object.interfacesConfig[el]){
        //         //TODO use method instead
        //         delete object.interfacesConfig[el];
        //         object.serverLogs(el + "' interface configuration has been deleted.", "success");
        //     }
        //     else{
        //         object.serverLogs("Interface configuration '" + el + "' doesn't exist.", "warning");
        //     }
        //
        // })
        // object.saveInterfaces();
    }

    else if(topicList[0] === "use")
        object.useInterface(parsedInterface)

    else if(topicList[0] === "end"){
        object.serverLogs("Topic interfaces/end is not available", "warning");
        // let oldInterface = object.getOnlineInterface();
        // object.destroyPipeline();
        // object.serverLogs("Interface " + oldInterface + " has been finished.", "success", true)
    }
    else{
        object.serverLogs("I dont know this topic.", "warning")
    }
}

module.exports = handleInterfaces;