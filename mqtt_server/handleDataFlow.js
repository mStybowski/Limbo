function handleDataFlow(object, topicList, message){

    topicList.shift();

    if(topicList[0] === "emg"){
        object.handleRawData(topicList[0], JSON.parse(message.toString()));
    }
    else if(topicList[0] === "mmg"){
        console.log("*** MMG DATA RECEIVED");
    }
    else if(topicList[0] === "test"){
        console.log("*** TEST DATA RECEIVED");
        object.handleRawData(topicList[0], JSON.parse(message.toString()));
    }



}

module.exports = handleDataFlow;