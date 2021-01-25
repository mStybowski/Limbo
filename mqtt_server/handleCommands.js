const {limbo_server} = require("./main")
const serverState = require("./serverState")

function handleCommands(object, topicList, message){

    topicList.shift();
    let parsedMessage = message.toString();

    if(topicList[0] === "useMode")
        serverState.setState({mode:parsedMessage})


    else if(topicList[0] === "createPipeline" || topicList[0] === "cp")
        limbo_server.startCreatingPipeline();


    else if(topicList[0] === "startPipeline" || topicList[0] === "start")
        object.startPipeline();


    else if(topicList[0] === "stopPipeline" || topicList[0] === "stop")
        object.stopPipeline();


    else if(topicList[0] === "gesture"){
        object.setGesture(parsedMessage);
        object.serverLogs("Current gesture set to " + parsedMessage);
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

    else if(topicList[0] === "finishLearn")
        object.finishLearnMode()

    else if(topicList[0] === "controlSensor"){
        if(object.isAnyInterfaceOnline()){
            let _topic = "sensors/control/" + object.getOnlineInterface().toString();
            object.send(_topic, message.toString())
            object.serverLogs("Command " + message.toString() + " sent.")
        }
        else
            object.serverLogs("No interface is currently in use", "warning", true)
    }

    else
        object.serverLogs("I dont know this topic.", "warning")
}

module.exports = handleCommands;