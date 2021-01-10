const checkJSONCorrectness = require("./checkJSONCorrectness")

function handleSensors(object, topic, mess){

    let parsedMessage = checkJSONCorrectness(mess);
    let topicList = topic.split('/');
    topicList.shift();

    if(!parsedMessage){
        console.log("Warning: Server received invalid message at topic: " + topic);
        return
    }

    if(!object.isInterfaceConfigured(topicList[1])){
        console.log("Warning: Received message from unconfigured interface: " + topicList[1]);
        return
    }

    if(!object.isInterfaceOnline(topicList[1])){
        console.log("Info: Interface '" + topicList[1] + "' is not used at the moment. First you must turn it on.");
        return
    }

    if(topicList[0] === "data")
        object.handleRawData(topicList[1], JSON.stringify(parsedMessage));
    
    else if(topicList[0] === "log")
        console.log(topicList[1] + " sends: " + mess.toString())// ROBOCZO

    else{
        //TODO Wyślij do gui info że nie rozpoznano danych
        console.log("Warning: Received data at unconfigured topic: " + topicList[0]);
    }
}

module.exports = handleSensors;