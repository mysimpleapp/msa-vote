const { join } = require('path')
const { Orm } = Msa.require("db")
const { userMdw,  permPublic } = Msa.require("user")
const { VoteSetsDb, VotesDb } = require('./db')
const { voteParamsDef } = require('./params')

class MsaVoteModule extends Msa.Module {

	constructor(dbKeyPrefix){
		super()
		this.dbKeyPrefix = dbKeyPrefix
		this.initDb()
		this.initApp()
	}

	initDb(){
		this.setsDb = VoteSetsDb
		this.db = VotesDb
	}

	getDbKeyPrefix(req){
		let dbKeyPrefix = deepGet(req, "voteArgs", "dbKeyPrefix")
		if(dbKeyPrefix === undefined) dbKeyPrefix = this.dbKeyPrefix
		return dbKeyPrefix
	}

	buildDbKey(req, key){
		return this.getDbKeyPrefix(req) + '-' + key
	}

	formatVoteSet(req, voteSet){
		if(!voteSet) return null
		return {
			key: voteSet.key,
			nb: voteSet.nb,
			sum: voteSet.sum,
			canVote: this.canVote(req, voteSet)
		}
	}

	async getVoteSet(req, key){
		const voteSet = await this.setsDb.findOne({ where: { key }})
		if(!this.canRead(req, voteSet)) throw Msa.FORBIDDEN
		return this.formatVoteSet(req, voteSet)
	}

	async getVoteSets(req, keyPrefix){
		const voteSets = await this.setsDb.findAll({
			where:{ key: { [Orm.Op.like]: `${keyPrefix}-%` }}
		})
		return voteSets
			.filter(voteSet => this.canRead(req, voteSet))
			.map(voteSet => this.formatVoteSet(req, voteSet))
	}

	getUserKey(req){
		const user = req.session ? req.session.user : null
		return user ? user.name : req.connection.remoteAddress
	}

	getPerm(permKey, req, voteSet){
		let perm = deepGet(req, "voteArgs", "params", permKey)
		if(perm === undefined) deepGet(voteSet, "params", permKey)
		if(perm === undefined) perm = voteParamsDef.get(permKey).defVal
		return perm
	}

	canRead(req, voteSet){
		return this.getPerm("readPerm", req, voteSet).check(req.session.user)
	}

	canVote(req, voteSet){
		return this.getPerm("votePerm", req, voteSet).check(req.session.user)
	}

	initApp(){
		const app = this.app

		// get vote count
		app.get("/_count/:key", userMdw, async (req, res, next) => {
			try {
				const key = this.buildDbKey(req, req.params.key)
				res.json(await this.getVoteSet(req, key))
			} catch(err) { next(err) }
		})

		// get vote counts
		app.get("/_counts/:keyPrefix", userMdw, async (req, res, next) => {
			try {
				const keyPrefix = this.buildDbKey(req, req.params.keyPrefix)
				res.json(await this.getVoteSets(req, keyPrefix))
			} catch(err) { next(err) }
		})


		// post vote
		app.post("/_vote/:key", userMdw, async (req, res, next) => {
			try {
				const key = this.buildDbKey(req, req.params.key),
					vote = req.body.vote
				// insert vote in DB
				const voter = this.getUserKey(req)
				await this.db.upsert(
					{ key, voter, vote },
					{ where: { key, voter }})
				// count votes
				const count = await this.db.findOne({
					attributes: [
						[ Orm.fn('SUM', Orm.col('vote')), 'sum' ],
						[ Orm.fn('COUNT', Orm.col('vote')), 'nb' ]],
					where: { key }})
				const { sum = 0, nb = 0 } = count.dataValues
				// insert count in vote set DB
				await this.setsDb.upsert(
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

// utils

function deepGet(obj, key, ...args){
	if(obj === null) return undefined
	const obj2 = obj[key]
	if(obj2 === undefined) return
	if(args.length === 0) return obj2
	return deepGet(obj2, ...args)
}

// export
const exp = module.exports = new MsaVoteModule("vote")
exp.MsaVoteModule = MsaVoteModule
