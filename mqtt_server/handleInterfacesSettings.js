const checkJSONCorrectness = require("./checkJSONCorrectness")

function handleInterfaces(object, topic, message){

    let topicList = topic.split('/');

    let parsedMessage = checkJSONCorrectness(message, true); // TODO: rozdziel osobno check correctness osbono parse. W funckji parse odpal check correctness

    if(!parsedMessage){
        console.log("Warning: Server received invalid message at topic: " + topic);
        return
    }

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

    }
    else{
        console.log("Warning: I dont know this topic.")
    }
}

module.exports = handleInterfaces;