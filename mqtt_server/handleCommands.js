function handleCommands(object, topicList, message){

    topicList.shift();
    let parsedMessage = message.toString();
    console.log("MESSAGE: " + parsedMessage);

    if(topicList[0] === "useMode"){
        if(parsedMessage === "idle" || parsedMessage === "learn" || parsedMessage === "predict" ){
            object.setMode(parsedMessage)
        }
        else{
            console.log("Invalid mode");
        }
        
    }

    else if(topicList[0] === "gesture"){
        object.setGesture(parsedMessage);
    }
    
    else if(topicList[0] === "startRecording"){
        object.startRecording();
    }

    else{
        console.log("Warning: I dont know this topic.")
    }
}

module.exports = handleCommands;