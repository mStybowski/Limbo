const checkJSONCorrectness = require("./checkJSONCorrectness")

function handleSensors(object, topic, mess){

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

    if(topicList[0] === "data")
        object.handleRawData(topicList[1], JSON.stringify(parsedMessage));
    
    else if(topicList[0] === "log")
        console.log(topicList[1] + " sends: " + mess.toString())// ROBOCZO

    else{
        //TODO Wyślij do gui info że nie rozpoznano danych
        object.serverLogs("Received data at unconfigured topic: " + topicList[0], "warning", true);
    }
}

module.exports = handleSensors;