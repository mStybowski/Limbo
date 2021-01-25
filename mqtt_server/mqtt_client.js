const mqtt = require("mqtt")
const acceptableTopics = require("./acceptableTopics")
const handleRequests = require("./handleRequests")
const handleInterfaces = require("./handleInterfacesSettings")
const handleCommands = require("./handleCommands")
const handleSensors = require("./handleSensors")

function createArrayOfTopics(){

    let arrayOfTopics = [];

    for(const [key, value] of Object.entries(acceptableTopics)){
        value.forEach((el) =>{
            arrayOfTopics.push(el)
        })
    }
    return arrayOfTopics
}
class MQTTClient {

    client;

    state = {
        connected: false,
        mqttBrokerIP: "",
    }

    validateTopic(baseTopic, topic){

        return acceptableTopics[baseTopic].includes(topic)
    }

    connect(ip){

        let options = {
            clientId: "LimboServer",
            reconnectPeriod: 5
        }

        if (this.state.connected)
            return

        const client = mqtt.connect(ip, options);


        client.on("disconnect", () => {
            this.setServerState(
                {
                    connected: false,
                    mqttBrokerIP: ""
                }
            );
        })
        client.on("connect", () => {

            this.setServerState(
                {
                    connected: true,
                    mqttBrokerIP: ip,
                }
            );

            console.log("\x1b[32m", "✔ Connected to MQTT Broker at URL: " + this.state.mqttBrokerIP + " (2/2)\x1b[0m");

            client.subscribe(createArrayOfTopics(), function (err) {
                if (!err) {
                    client.publish('serverLogs', 'Server succesfully connected!')
                }
            })
        })
        client.on("error", (err) => {
            this.serverLogs("Could not connect to MQTT Broker. Please check your MQTT Broker settings.", "error", true)
            client.end();
        })

        client.on("message", (topic, mess) => {

            let parsedTopic = topic.split('/');

            // SENSORS
            if (parsedTopic[0] === "sensors") {
                handleSensors(topic, mess);
                return
            }

            if (!this.validateTopic(parsedTopic[0], topic)) {
                console.log("\x1b[33m%s\x1b[0m", "\nWarning: Invalid topic: " + topic + "\n")
                console.log("Available options are: ")

                acceptableTopics[parsedTopic[0]].forEach((el) => {
                    console.log("\x1b[34m%s\x1b[0m", "- " + el);
                })

                return;
            }

            // GUI REQUESTS
            if (parsedTopic[0] === "request")
                handleRequests(parsedTopic, mess);

            // INTERFACES
            else if (parsedTopic[0] === "interfaces")
                handleInterfaces(topic, mess);

            // COMMANDS
            else if (parsedTopic[0] === "command")
                handleCommands(parsedTopic, mess)

            // INVALID
            else
                this.serverLogs("Server received message at invalid topic: " + parsedTopic[0], "warning")
        })
        this.client = client;
    }
}

module.exports = MQTTClient