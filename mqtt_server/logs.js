//
// class Logs {
//
//
//     static serverLogs(_payload, type = "info", verbose = false) {
//
//         let upperCaseType = type.toUpperCase();
//
//         if (!this.isLogTypeCorrect(upperCaseType)) {
//             this.serverLogs("Received message from server of unknown type: :'" + type + "'")
//         }
//
//         let messageObject = {
//             payload: _payload,
//             type: upperCaseType,
//             verbose
//         }
//
//         this.client.publish("serverLogs", JSON.stringify(messageObject));
//
//         let colors = {
//             NEUTRAL: "\x1b[37m%s\x1b[0m",
//             SUCCESS: "\x1b[32m%s\x1b[0m",
//             INFO: "\x1b[34m%s\x1b[0m",
//             WARNING: "\x1b[33m%s\x1b[0m",
//             ERROR: "\x1b[31m%s\x1b[0m"
//         }
//
//         console.log(colors[upperCaseType], upperCaseType + ": " + _payload);
//     }
//
//     static scriptLogs(source = "unspecified", payload = "none", type = "info") {
//
//         let upperCaseType = type.toUpperCase();
//
//         if (!this.isLogTypeCorrect(upperCaseType)) {
//             this.serverLogs("Received message from " + source + " of unknown type: :'" + type + "'")
//             return;
//         }
//
//         let messageObject = {
//             payload,
//             type: upperCaseType,
//             source
//         }
//
//         let colors = {
//             NEUTRAL: "\x1b[37m%s\x1b[0m",
//             SUCCESS: "\x1b[32m%s\x1b[0m",
//             INFO: "\x1b[34m%s\x1b[0m",
//             WARNING: "\x1b[33m%s\x1b[0m",
//             ERROR: "\x1b[31m%s\x1b[0m"
//         }
//
//         console.log(colors[upperCaseType], upperCaseType + ": " + payload + " from " + source);
//         this.send("scriptLogs", JSON.stringify(messageObject));
//     }
//
//     static sensorLogs(sensor = "unspecified", payload = "none", type = "info") {
//
//         let upperCaseType = type.toUpperCase();
//
//         if (!this.isLogTypeCorrect(upperCaseType)) {
//             this.serverLogs("Received message from " + sensor + " of unknown type: :'" + type + "'")
//             return;
//         }
//
//         let messageObject = {
//             payload,
//             type: upperCaseType,
//             sensor
//         }
//
//         this.send("sensorLogs", JSON.stringify(messageObject));
//     }
//
//     isLogTypeCorrect(type) {
//         return (type === "WARNING" || type === "INFO" || type === "SUCCESS" || type === "ERROR" || type === "NEUTRAL")
//     }
//
// }