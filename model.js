const { VoteParamDict } = require("./params")

const exp = module.exports = {}

const VOTE_SET_FIELDS = [ "sum", "nb", "createdBy", "params" ]

exp.VoteSet = class {

    constructor(id) {
        this.id = id
        this.sum = 0
        this.nb = 0
        this.params = new VoteParamDict()
    }

    formatForDb() {
        const res = {}
        res._id = this.id
        VOTE_SET_FIELDS.forEach(f => res[f] = this[f])
        res.params = res.params.getAsDbVal()
        return res
    }

    parseFromDb(dbVoteSet) {
        VOTE_SET_FIELDS.forEach(f => this[f] = dbVoteSet[f])
        this.params = VoteParamDict.newFromDbVal(dbVoteSet.params)
    }

    static newFromDb(id, dbVoteSet) {
        const voteSet = new this(id)
        if (dbVoteSet) voteSet.parseFromDb(dbVoteSet)
        return voteSet
    }
}


exp.Vote = class {

    constructor(voteSetId, voter) {
        this.voteSetId = voteSetId
        this.voter = voter
    }

    formatForDb() {
        return {
            _id: `${this.voteSetId}-${this.voter}`,
            voteSetId: this.voteSetId,
            voter: this.voter,
            vote: this.vote
        }
    }

    parseFromDb(dbVote) {
        this.vote = dbVote.vote
    }

    static newFromDb(voteSetId, voter, dbVote) {
        const vote = new this(voteSetId, voter)
        if (dbVote) vote.parseFromDb(dbVote)
        return vote
    }
}