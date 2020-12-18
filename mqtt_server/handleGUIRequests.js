const MQTTClient = require("./main")

function handleGUICommands(object, topicList, message){
        topicList.shift();
        if(topicList[0] === "state"){
                object.send("serverResponses/state", JSON.stringify(object.state));
                console.log("Wyslano server state");
        }
        else if(topicList[0] === "filesList"){

                object.updatePythonScripts()
                setTimeout(() => {console.log((object.pythonFiles).join())}, 0)
                // object.send("serverResponses/filesList", (object.getPythonScripts()).join());
        }


}

module.exports = handleGUICommands;