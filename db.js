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
		get() { const val = this.getDataValue('params'); return val ? voteParamsDef.deserialize(val) : null },
		set(val) { if(val) val = voteParamsDef.serialize(val); this.setDataValue('params', val) }
	}
})

module.exports = { VotesDb, VoteSetsDb }
