//
// class MQTTClient {
//
//     state = {
//         connected: false,
//
//     }
//
//     connect(ip){
//
//         let options = {
//             clientId: "LimboServer",
//             reconnectPeriod: 5
//         }
//
//         if (this.MQTTState.connected)
//             return
//
//         const client = mqtt.connect(ip, options);
//
//
//         client.on("disconnect", () => {
//             this.setServerState(
//                 {
//                     connected: false,
//                     mqttBrokerIP: "",
//                     mode: "idle"
//                 }
//             );
//         })
//         client.on("connect", () => {
//
//             this.setServerState(
//                 {
//                     connected: true,
//                     mqttBrokerIP: ip,
//                     mode: "idle"
//                 }
//             );
//
//             console.log("\x1b[32m", "✔ Connected to MQTT Broker at URL: " + this.MQTTState.mqttBrokerIP + " (2/2)\x1b[0m");
//
//             client.subscribe(subscribedTopics, function (err) {
//                 if (!err) {
//                     client.publish('serverLogs', 'Server succesfully connected!')
//                 }
//             })
//         })
//         client.on("error", (err) => {
//             this.serverLogs("Could not connect to MQTT Broker. Please check your MQTT Broker settings.", "error", true)
//             client.end();
//         })
//
//         client.on("message", (topic, mess) => {
//
//             let parsedTopic = topic.split('/');
//
//             // SENSORS
//             if (parsedTopic[0] === "sensors") {
//                 handleSensors(this, topic, mess);
//                 return;
//             }
//
//             if (!validateTopic(parsedTopic[0], topic)) {
//                 console.log("\x1b[33m%s\x1b[0m", "\nWarning: Invalid topic: " + topic + "\n")
//                 console.log("Available options are: ")
//
//                 acceptableTopics[parsedTopic[0]].forEach((el) => {
//                     console.log("\x1b[34m%s\x1b[0m", "- " + el);
//                 })
//
//                 return;
//             }
//
//
//             // GUI REQUESTS
//             if (parsedTopic[0] === "request")
//                 handleRequests(this, parsedTopic, mess);
//
//
//
//             // INTERFACES
//             else if (parsedTopic[0] === "interfaces") {
//                 handleInterfaces(this, topic, mess);
//             } else if (parsedTopic[0] === "command") {
//                 handleCommands(this, parsedTopic, mess)
//             } else
//                 this.serverLogs("Server received message at invalid topic: " + parsedTopic[0], "warning")
//         })
//         this.client = client;
//     }
// }