
module.exports = {
    scriptStates:{

    },

    setScriptState: (script, state) => {
        this.scriptStates[script] = state
    },

    getScriptState: (script) => {
        return this.scriptStates[script]
    }

}