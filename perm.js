const { PermNum } = Msa.require("user/perm")

const labels = [
	{ name: "None" },
	{ name: "Read" },
	{ name: "Vote" }]

class VotePerm extends PermNum {
	getMaxValue() { return 2 }
	getLabels() { return labels }
	getDefaultValue() { return 2 }
}
VotePerm.NONE = 0
VotePerm.READ = 1
VotePerm.VOTE = 2

module.exports = { VotePerm }
