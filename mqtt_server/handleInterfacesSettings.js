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
        let parsedMessage = JSON.parse(message.toString());
        let interfaces = parsedMessage["interfaces"];
        interfaces.forEach((el) => {
            object.createInterfaceHandler(el);
        })

    }
}

module.exports = handleInterfaces;