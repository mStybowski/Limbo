function handleRequests(object, topicList, message){
        topicList.shift();
        if(topicList[0] === "state"){
                object.send("server/state", JSON.stringify(object.state));
                console.log("Wyslano server state");
        }
        else if(topicList[0] === "files"){

        }
        else if(topicList[0] === "onlineInterface"){
                let messageToSend = JSON.stringify(object.getOnlineInterface());
                object.send("server/onlineInterface", messageToSend);
        }
        else if(topicList[0] === "interfacesConfiguration"){

        }
        else if(topicList[0] === "learning"){
                //TODO: if no interface specified then throw a warning
        }
        else if(topicList[0] === "learning/#"){
                // TODO: Where # === gesture
        }
        else if(topicList[0] = "runScript"){
                object.runOnce(script);
        }


}

module.exports = handleRequests;