function handleDataFlow(object, topicList, message){
    topicList.shift();
    if(topicList[0] === "emg"){
        console.log("--- EMG DATA RECEIVED");
    }
    else if(topicList[0] === "mmg"){
        console.log("*** MMG DATA RECEIVED");
    }



}

module.exports = handleDataFlow;