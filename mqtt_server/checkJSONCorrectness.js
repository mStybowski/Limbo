function checkJSONCorrectness(message, isInterfaces=false){

    let parsedMessage = {};

    try{
        parsedMessage = JSON.parse(message.toString());
    }
    catch{
        return null;
    }

    if(isInterfaces === true){
        if(!parsedMessage["interface"]){
            console.log("Incorrect message");
            return null;
        }

    }
 
    return parsedMessage;
}

module.exports = checkJSONCorrectness;