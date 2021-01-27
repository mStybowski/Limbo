function handleRequests(object, topicList, message) {
    topicList.shift();

    if (topicList[0] === "state") {
        object.send("server/state", JSON.stringify(object.state));

        object.serverLogs(`Server state has been published.`);
    } else {
        try {
            let topic = "server/" + topicList[0];
            console.log(`Topic: ${topic}`)
            console.log(`Message: ${object.state[topicList[0]]}`)
            object.send(topic, object.state[topicList[0]])
        } catch {
            console.log("Something went wrong!")
        }
    }
}
module.exports = handleRequests;