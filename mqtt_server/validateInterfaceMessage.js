let checkJSONCorrectness= require("./checkJSONCorrectness")

function validateInterfaceMessage(rawMessage){

    let messageObject = checkJSONCorrectness(rawMessage);

    try{
        let chosenInterface = messageObject["interface"];
        if(chosenInterface)
            return messageObject
    }
    catch{
        return null
    }

}

module.exports = validateInterfaceMessage