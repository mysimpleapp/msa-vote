const { ParamsDef } = Msa.require("params")
const { permPublic, PermParamDef } = Msa.require("user")

const voteParamsDef = new ParamsDef()
voteParamsDef.add("readPerm", new PermParamDef({
	defVal: permPublic
}))
voteParamsDef.add("votePerm", new PermParamDef({
	defVal: permPublic
}))
 
module.exports = { voteParamsDef }
