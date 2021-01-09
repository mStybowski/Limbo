function handleDataFlow(object, topicList, message){

    topicList.shift();

    if(object.interfacesConfig[topicList[0]]){
        object.handleRawData(topicList[0], message.toString());

    }
    else{
        //TODO Wyślij do gui info że nie rozpoznano danych
        console.log("Warning: Received data at unconfigured topic: " + topicList[0]);
    }




}

module.exports = handleDataFlow;