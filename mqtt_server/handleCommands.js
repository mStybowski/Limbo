function handleCommands(object, topicList, message){

    topicList.shift();
    let parsedMessage = message.toString();

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
        if(object.isAnyInterfaceOnline())
            if(object.state.mode === "learn")
                object.startRecording();
            else
                object.serverLogs("To start recording you first must set mode to learn.", "warning", true);
        else
            object.serverLogs("No interface is online. First you must turn it on using interfaces/use topic.", "warning", true);
    }

    else if(topicList[0] === "controlSensor"){
        if(object.isAnyInterfaceOnline()){
            let _topic = "sensors/control/" + object.getOnlineInterface().toString();
            object.send(_topic, message.toString())
            console.log("Command " + message.toString() + " sent.")
        }
        else{
            console.log("Error: No interface is currently in use")
        }
     
    }

    else{
        console.log("Warning: I dont know this topic.")
    }
}

module.exports = handleCommands;