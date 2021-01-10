// const checkJSONCorrectness = require("./checkJSONCorrectness")

// function handleDataFlow(object, topic, message){

//     let parsedMessage = checkJSONCorrectness(message);

//     if(!parsedMessage){
//         console.log("Warning: Server received invalid message at topic: " + topic);
//         return
//     }

//     let topicList = topic.split('/');
//     topicList.shift();

//     if(object.interfacesConfig[topicList[0]]){
//         object.handleRawData(topicList[0], message.toString());

//     }
//     else{
//         //TODO Wyślij do gui info że nie rozpoznano danych
//         console.log("Warning: Received data at unconfigured topic: " + topicList[0]);
//     }
// }

// module.exports = handleDataFlow;