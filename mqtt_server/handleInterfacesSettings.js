function checkCorrectness(message){

    let parsedMessage = JSON.parse(message.toString());

    if(!parsedMessage["interfaces"] || !Array.isArray(parsedMessage["interfaces"])){
        console.log("Incorrect message");
        return null;
    }

    else if(parsedMessage["interfaces"].length === 0){
        console.log("Info: Nothing to do here.")
        return null;
    }
    return parsedMessage;
}

function handleInterfaces(object, topicList, message){

    let parsedMessage = checkCorrectness(message);

    if(!parsedMessage)
        return;

    topicList.shift();
    let interfaces = parsedMessage["interfaces"];


    if(topicList[0] === "add"){

        interfaces.forEach((el, index) => {
            // use method instead of accesing data directly
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
                //TODO use method instead
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
            if(!object.isInterfaceOnline(el))
                object.createPipeline(el);
            
            else
                console.log("Warning: " + el + " pipeline is already online"); 
        })
    }

    else if(topicList[0] === "end"){
        interfaces.forEach((el) => {
            if(object.onlineInterfaces[el]){
                delete object.onlineInterfaces[el];
                console.log("Success: Terminated '" + el + "' interface.");
            }
            else{
                let message = "There is no '" + el + "' interface currently running. Skipped this one.";
                console.log(message);
                object.serverLogs(message, "Warning", true);
            }
            
        })
    }
    else{
        console.log("Warning: I dont know this topic.")
    }
}

module.exports = handleInterfaces;