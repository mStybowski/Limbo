
module.exports = {
    state:{
        gesture: null,
        onlineInterface: null,
        mode: null,
        recording: false,
        run: false,
        pipelineCreated: false
    },

    setState: (newState) => {
        this.state = {...this.state, ...newState};
        this.send("server/MQTTState", JSON.stringify(this.MQTTState));
    },

    getState: () => {
        return this.state
    }

}