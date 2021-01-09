function checkJSONCorrectness(message, isInterfaces=false){

    let parsedMessage = {};

    try{
        parsedMessage = JSON.parse(message.toString());
    }
    catch{
        return null;
    }

    if(isInterfaces === true){
        if(!parsedMessage["interfaces"] || !Array.isArray(parsedMessage["interfaces"])){
            console.log("Incorrect message");
            return null;
        }
    
        else if(parsedMessage["interfaces"].length === 0){
            console.log("Info: Nothing to do here.")
            return null;
        }
    }
 
    return parsedMessage;
}

module.exports = checkJSONCorrectness;