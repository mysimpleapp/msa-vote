const { PermNum } = Msa.require("user/perm")

const labels = [
	{ name: "None" },
	{ name: "Read" },
	{ name: "Vote" }]

class VotePerm extends PermNum {
	getMaxVal(){ return 2 }
	getLabels(){ return labels }
}
VotePerm.NONE = 0
VotePerm.READ = 1
VotePerm.VOTE = 2

module.exports = { VotePerm }