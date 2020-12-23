function handleRequests(object, topicList, message){
        topicList.shift();
        if(topicList[0] === "state"){
                object.send("server/state", JSON.stringify(object.state));
                console.log("Wyslano server state");
        }
        else if(topicList[0] === "runInterpreter"){

                object.updatePythonScripts()
                setTimeout(() => {console.log((object.pythonFiles).join())}, 0)
                // object.send("serverResponses/filesList", (object.getPythonScripts()).join());
        }



}

module.exports = handleRequests;