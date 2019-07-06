const { ParamsDef } = Msa.require("params")
const { newPermParamDef } = Msa.require("user")
const { VotePerm } = require("./perm")

const voteParamsDef = new ParamsDef()
voteParamsDef.add("perm", newPermParamDef(VotePerm, VotePerm.VOTE))
 
module.exports = { voteParamsDef }
