function handleInterfaces(object, topicList, message){
    topicList.shift();
    let parsedMessage = JSON.parse(message.toString());
    let interfaces = parsedMessage["interfaces"];

    if(interfaces.length === 0){
        console.log("Info: Nothing to do here.")
        return;
    }

    if(topicList[0] === "add"){

        interfaces.forEach((el, index) => {
            if(object.interfacesConfig[el]){
                console.log("Warning: Interface '" + el + "' already exists. Remove it or choose diffrent name for the new one.");
            }
            else{
                object.interfacesConfig[el]=parsedMessage["attributes"][index];
                console.log("Success: Newly created interface '" + el + "' had been saved.");
            }
            
        })
        object.saveInterfaces();
    }

    else if(topicList[0] === "edit"){
        interfaces.forEach((el, index) => {
            if(!object.interfacesConfig[el]){
                console.log("Warning: Interface '" + el + "' doesn't exist.");
            }
            else{
                object.interfacesConfig[el]=parsedMessage["attributes"][index];
                console.log("Success: Freshly updated interface '" + el + "' had been saved.");
            }
            
        })
        object.saveInterfaces();
    }

    else if(topicList[0] === "remove"){
        interfaces.forEach((el) => {
            if(object.interfacesConfig[el]){
                delete object.interfacesConfig[el];
                console.log("Success: '" + el + "' Interface has been deleted.");
            }
            else{
                console.log("Warning: Interface '" + el + "' doesn't exist.");
            }
            
        })
        object.saveInterfaces();
    }
    
    else if(topicList[0] === "use"){
        interfaces.forEach((el) => {
            if(!object.onlineInterfaces[el])
                object.createInterfaceHandler(el);
            
            else
                console.log("Warning: " + el + " interface is already online"); 
        })
    }

    else if(topicList[0] === "end"){
        interfaces.forEach((el) => {
            if(object.onlineInterfaces[el]){
                delete object.onlineInterfaces[el];
                console.log("Success: Terminated '" + el + "' interface.");
            }
            else{
                console.log("Warning: There is no '" + el + "' interface currently running. Skipped this one.");
            }
            
        })
    }
}

module.exports = handleInterfaces;