const checkJSONCorrectness = require("./checkJSONCorrectness")

function handleSensors(object, topic, mess){

    if(!object.state.run)
    {
        object.serverLogs("Received data but pipeline is not running. Use topic command/startPipeline or command/start to run pipeline", "info", true)
        return;
    }

    let parsedMessage = checkJSONCorrectness(mess);
    let topicList = topic.split('/');
    topicList.shift();



    if(!parsedMessage){
        object.serverLogs("Server received invalid message at topic: " + topic, "warning", true);
        return
    }

    if(!object.isInterfaceConfigured(topicList[1])){
        object.serverLogs("Received message from unconfigured interface: " + topicList[1], "warning", true);
        return
    }

    if(!object.isInterfaceOnline(topicList[1])){
        object.serverLogs("Interface '" + topicList[1] + "' is not used at the moment. First you must turn it on.", "info", true);
        return
    }


    if(topicList[0] === "data"){
        // if(object.isAnyScriptDown().length > 0){
        //     object.serverLogs("The following scripts are not working: " + object.isAnyScriptDown())
        // }
        object.handleRawData(topicList[1], JSON.stringify(parsedMessage));
    }

    else if(topicList[0] === "log"){
        if(parsedMessage["type"] && parsedMessage["payload"])
            object.sensorLogs(topicList[1], parsedMessage.payload, parsedMessage.type);
        else
            object.serverLogs("Log message from " + topicList[1] + " is invalid.", "warning");
    }

    else{
        //TODO Wyślij do gui info że nie rozpoznano danych
        object.serverLogs("Received data at unconfigured topic: " + topicList[0], "warning", true);
    }
}

module.exports = handleSensors;