const validateInterfaceMessage = require("./validateInterfaceMessage")

function handleInterfaces(object, topic, rawMessage){

    if(!validateInterfaceMessage(rawMessage)){
        object.serverLogs("Received invalid message at interfaces/# topic", "warning", true);
        return;
    }

    let parsedMessage = JSON.parse(rawMessage.toString());
    let parsedInterface = parsedMessage["interface"];
    let parsedData = parsedMessage["arguments"]
    let topicList = topic.split('/');
    topicList.shift();

    if(topicList[0] === "add"){

        let data = parsedMessage.arguments;
        object.addNewInterface(parsedInterface, data);

    }

    else if(topicList[0] === "edit"){
        try{
            object.interfacesConfig[parsedInterface] = {...object.interfacesConfig[parsedInterface], ...parsedData};
            object.saveInterfaces()
        }
        catch{
            console.log("Something went wrong!")
        }
    }

    else if(topicList[0] === "remove"){
        try {
            delete object.interfacesConfig[parsedInterface]
            object.saveInterfaces()
            console.log(object.interfacesConfig)
        }
        catch{
            console.log("Something went wrong!")
        }
    }

    else if(topicList[0] === "use")
        object.setInterface(parsedInterface)

    else if(topicList[0] === "unset"){
        if(object.state.pipelineCreated)
            object.serverLogs("You can't change the interface after creating the pipeline!", "warning", true)
        else
            object.state.onlineInterface = null
    }
    else{
        object.serverLogs("I dont know this topic.", "warning")
    }
}

module.exports = handleInterfaces;