function checkJSONCorrectness(rawMessage){

    let parsedMessage;

    try{
        parsedMessage = JSON.parse(rawMessage.toString());
    }
    catch{
        parsedMessage = null;
    }

    return parsedMessage;
}

module.exports = checkJSONCorrectness