function request(object, topicList, message){
        topicList.shift();

        if(topicList[0] === "state"){
                object.send("server/state", JSON.stringify(object.state));

                object.serverLogs(`Server state has been published.`);
        }
        
        else if(topicList[0] === "files"){

        }

        else if(topicList[0] === "onlineInterface"){
                let messageToSend = JSON.stringify(object.getOnlineInterface());
                object.send("server/onlineInterface", messageToSend);
                object.serverLogs(`onlineInterface has been published`);
        }

        else if(topicList[0] === "interfacesConfiguration"){
                let messageToSend = JSON.stringify(object.getInterfacesConfiguration());
                object.send("server/interfacesConfiguration", messageToSend);
                object.serverLogs(`interfaceConfiguration has been published`);
        }

        else{
                console.log(`Warning: I dont know this (${topicList[0]}) topic.`)
                object.serverLogs(`I dont know this (${topicList[0]}) topic.`, "warning");
        }
}

module.exports = request;