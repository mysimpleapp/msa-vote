const { PermNum } = Msa.require("user/perm")

class VotePerm extends PermNum {
	getMaxVal(){ return 2 }
}
VotePerm.NONE = 0
VotePerm.READ = 1
VotePerm.VOTE = 2

module.exports = { VotePerm }
