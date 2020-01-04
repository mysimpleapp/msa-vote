const { PermNum } = Msa.require("user/perm")

const labels = [
	{ name: "None" },
	{ name: "Read" },
	{ name: "Vote" }]

const defExpr = { group:"all", value: 2 }

class VotePerm extends PermNum {
	getMaxValue(){ return 2 }
	getLabels(){ return labels }
	getDefaultExpr(){ return defExpr }
}
VotePerm.NONE = 0
VotePerm.READ = 1
VotePerm.VOTE = 2

module.exports = { VotePerm }
