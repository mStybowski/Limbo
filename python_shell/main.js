let {PythonShell} = require('python-shell'); 
const fileState = require("../mqtt_server/filesState")

// Configuration object
let defaultOptions = {
    mode: 'text',
    scriptPath: './python_scripts/',
    pythonOptions: ['-u'], // get print results in real-time
    args: ['1', '2', '3']
};

class PythonInterpreter{

    static spawn(url, onMessageCallback, options = defaultOptions){

        let pInterpreter = new PythonShell(url, options);

        pInterpreter.childProcess.on("spawn", () => {
            console.log('\x1b[36m%s\x1b[0m', `${url} IS RUNNING`)
        })
        pInterpreter.on('message', onMessageCallback);
        pInterpreter.on('close', ()=>{
            console.log('\x1b[36m%s\x1b[0m', "Script " + url + " has been exited. \n")
        });
        pInterpreter.on('error', function (stderr) {
            pInterpreter.end(()=>{
                console.log('\x1b[33m%s\x1b[0m', "Critical error at script: " + url + ". Finished this script to prevent server failure. Try again.")
                console.log("\nError message for python fans:\n")
                console.log('\x1b[31m%s\x1b[0m', stderr)
            })
          });
          // TODO: jesli jest critical error na ktorms ze skryptow to zablokuj mozliwosc jego uzycia.

        return pInterpreter;
    }

    static run({url, callback, options = defaultOptions}){
        // You should print data using print() in python
        // Callback receives two parameters:
        // err, results
        // where, results is an array consisting of messages collected during execution
        console.log("url: " + url)
        console.log(defaultOptions.scriptPath);
        PythonShell.run(url, options, callback);
    }

}

module.exports = PythonInterpreter