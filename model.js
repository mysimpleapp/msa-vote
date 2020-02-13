const { VoteParamDict } = require("./params")

const exp = module.exports = {}


exp.VoteSet = class {

    constructor(id) {
        this.id = id
        this.sum = 0
        this.nb = 0
        this.params = new VoteParamDict()
    }

    formatForDb(keys) {
        const res = {}
        if (!keys || keys.indexOf("id") >= 0)
            res.id = this.id
        if (!keys || keys.indexOf("sum") >= 0)
            res.sum = this.sum
        if (!keys || keys.indexOf("nb") >= 0)
            res.nb = this.nb
        if (!keys || keys.indexOf("params") >= 0)
            res.params = this.params.getAsDbStr()
        return res
    }

    parseFromDb(dbVoteSet) {
        this.sum = dbVoteSet.sum
        this.nb = dbVoteSet.nb
        this.params = VoteParamDict.newFromDbStr(dbVoteSet.params)
    }

    static newFromDb(id, dbVoteSet) {
        const voteSet = new this(id)
        if (dbVoteSet) voteSet.parseFromDb(dbVoteSet)
        return voteSet
    }
}


exp.Vote = class {

    constructor(id, voter) {
        this.id = id
        this.voter = voter
    }

    formatForDb() {
        return {
            id: this.id,
            voter: this.voter,
            vote: this.vote
        }
    }

    parseFromDb(dbVote) {
        this.vote = dbVote.vote
    }

    static newFromDb(id, voter, dbVote) {
        const vote = new this(id, voter)
        if (dbVote) vote.parseFromDb(dbVote)
        return vote
    }
}