// DB model
const { orm, Orm } = Msa.require("db")

const VoteVoicesDb = orm.define('msa_vote_voices', {
	key: { type: Orm.STRING, primaryKey: true },
	voter: { type: Orm.STRING, primaryKey: true },
	vote: Orm.INTEGER
})

const VotesDb = orm.define('msa_votes', {
	key: { type: Orm.STRING, primaryKey: true },
	sum: Orm.INTEGER,
	nb: Orm.INTEGER
})

module.exports = { VotesDb, VoteVoicesDb }
