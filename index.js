const { join } = require('path')
const { Orm } = Msa.require("db")
const { VotesDb, VoteVoicesDb } = require('./db')

class MsaVoteModule extends Msa.Module {

	constructor(dbKey){
		super()
		this.dbKey = dbKey
		this.initDb()
		this.initApp()
	}

	initDb(){
		this.db = VotesDb
		this.voicesDb = VoteVoicesDb
	}

	getFullDbKey(key){
		return this.dbKey + '-' + key
	}

	formatVoteCount(vote){
		if(!vote) return null
		return { key:vote.key, nb:vote.nb, sum:vote.sum }
	}

	async getVoteCount(key){
		const vote = await this.db.findOne({ where: { key }})
		return this.formatVoteCount(vote)
	}

	async getVoteCounts(keyPrefix){
		const votes = await this.db.findAll({
			where:{ key: { [Orm.Op.like]: `${keyPrefix}-%` }}
		})
		return votes.map(this.formatVoteCount)
	}


	initApp(){
		const app = this.app

		// get vote count
		app.get("/_count/:key", async (req, res, next) => {
			try {
				const key = this.getFullDbKey(req.params.key)
				res.json(await this.getVoteCount(key))
			} catch(err) { next(err) }
		})

		// get vote counts
		app.get("/_counts/:keyPrefix", async (req, res, next) => {
			try {
				const keyPrefix = this.getFullDbKey(req.params.keyPrefix)
				res.json(await this.getVoteCounts(keyPrefix))
			} catch(err) { next(err) }
		})


		// post vote
		app.post("/_vote/:key", async (req, res, next) => {
			try {
				const key = this.getFullDbKey(req.params.key),
					vote = req.body.vote
				// determine voter
				const user = this.session ? this.session.user : null
				const voter = user ? user.name : req.connection.remoteAddress
				// insert vote voice in DB
				await this.voicesDb.upsert(
					{ key, voter, vote },
					{ where: { key, voter }})
				// count vote voices
				const count = await this.voicesDb.findOne({
					attributes: [
						[ Orm.fn('SUM', Orm.col('vote')), 'sum' ],
						[ Orm.fn('COUNT', Orm.col('vote')), 'nb' ]],
					where: { key }})
				const { sum = 0, nb = 0 } = count.dataValues
				// insert count in DB
				await this.db.upsert(
					{ key, sum, nb },
					{ where: { key }})
				// returm ok
				res.sendStatus(200)
			} catch(err) {
				next(err)
			}
		})
	}
}

// export
const exp = module.exports = new MsaVoteModule("vote")
exp.MsaVoteModule = MsaVoteModule
