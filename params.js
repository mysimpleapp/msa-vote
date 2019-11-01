const { ParamsDef } = Msa.require("params")
const { VotePerm } = require("./perm")

const voteParamsDef = new ParamsDef()
voteParamsDef.add("perm", VotePerm.newPermParamDef(VotePerm.VOTE))
 
module.exports = { voteParamsDef }
