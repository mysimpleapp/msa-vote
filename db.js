// DB model
const { orm, Orm } = Msa.require("db")
const { voteParamsDef } = require("./params")

const VotesDb = orm.define('msa_votes', {
	key: { type: Orm.STRING, primaryKey: true },
	voter: { type: Orm.STRING, primaryKey: true },
	vote: Orm.INTEGER
})

const VoteSetsDb = orm.define('msa_vote_sets', {
	key: { type: Orm.STRING, primaryKey: true },
	sum: Orm.INTEGER,
	nb: Orm.INTEGER,
	params: { type: Orm.TEXT,
		get() { return voteParamsDef.deserialize(this.getDataValue('params')) },
		set(val) { this.setDataValue('params', voteParamsDef.serialize(val)) }
	}
})

module.exports = { VotesDb, VoteSetsDb }
