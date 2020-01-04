const { ParamDict } = Msa.require("params")
const { VotePerm } = require("./perm")

class VoteParamDict extends ParamDict {
    constructor(){
        super()
        this.perm = VotePerm.newParam()
    }
}
 
module.exports = { VoteParamDict }
