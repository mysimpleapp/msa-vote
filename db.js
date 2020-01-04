// DB model
const { orm, Orm } = Msa.require("db")
const { VoteParamDict } = require("./params")

const VotesDb = orm.define('msa_votes', {
	id: { type: Orm.STRING, primaryKey: true },
	voter: { type: Orm.STRING, primaryKey: true },
	vote: Orm.INTEGER
})

const VoteSetsDb = orm.define('msa_vote_sets', {
	id: { type: Orm.STRING, primaryKey: true },
	sum: Orm.INTEGER,
	nb: Orm.INTEGER,
	params: { type: Orm.TEXT,
		get() { return VoteParamDict.newFromDbVal(this.getDataValue('params')) },
		set(val) { this.setDataValue('params', val.getAsDbVal()) }
	}
})

module.exports = { VotesDb, VoteSetsDb }
