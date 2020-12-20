function handleInterfaces(object, topicList, message){
    topicList.shift();
    if(topicList[0] === "add"){
        
        let newInterface = JSON.parse(message.toString());
        object.interfaces[newInterface.name] = newInterface;

        console.log(object.interfaces);
    }
    else if(topicList[0] === "edit"){
        //TODO
    }
    else if(topicList[0] === "remove"){
        //TODO
    }
    else if(topicList[0] === "use"){
        //TODO Here we can accept array of wanted interfaces
    }
}

module.exports = handleInterfaces;