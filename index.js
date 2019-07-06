const { join } = require('path')
const { Orm } = Msa.require("db")
const { userMdw } = Msa.require("user")
const { VoteSetsDb, VotesDb } = require('./db')
const { VotePerm } = require("./perm")
const { voteParamsDef } = require('./params')

const defPerm = voteParamsDef.get("perm").defVal
const nullPerm = new VotePerm()

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
		return this.dbKeyPrefix
	}

	buildDbKey(req, key){
		return this.getDbKeyPrefix(req) + '-' + key
	}

	formatVoteSet(req, key, voteSet){
		if(!this.checkPerm(req, voteSet, 1))
			return null
		return {
			key: key,
			nb: voteSet ? voteSet.nb : 0,
			sum: voteSet ? voteSet.sum : 0,
			canVote: this.checkPerm(req, voteSet, 2)
		}
	}

	async getVoteSet(req, key){
		const voteSet = await this.setsDb.findOne({ where: { key }})
		return this.formatVoteSet(req, key, voteSet)
	}

	async getVoteSets(req, keys){
		const voteSets = await this.setsDb.findAll({
			where:{ key: { [Orm.Op.in]: keys }}
		})
		return keys
			.map(key => this.formatVoteSet(req, key, getByKey(voteSets, key)))
			.filter(voteSet => voteSet !== null)
	}

	getUserKey(req){
		const user = req.session ? req.session.user : null
		return user ? user.name : req.connection.remoteAddress
	}

	checkPerm(req, voteSet, expVal, prevVal) {
		const perm = deepGet(voteSet, "params", "perm")
		if(perm) prevVal = perm.solve(req.session.user, prevVal)
		if(prevVal!==undefined) return nullPerm.check(req.session.user, expVal, prevVal)
		else return defPerm.check(req.session.user, expVal)
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
/*
		// get vote counts
		app.get("/_counts/:keyPrefix", userMdw, async (req, res, next) => {
			try {
				const keyPrefix = this.buildDbKey(req, req.params.keyPrefix)
				res.json(await this.getVoteSets(req, keyPrefix))
			} catch(err) { next(err) }
		})
*/

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

function getByKey(arr, key){
	for(let i=0, len=arr.length; i<len; ++i){
		const el = arr[i]
		if(el.key === key) return el
	}
	return null
}

// export
const exp = module.exports = new MsaVoteModule("vote")
exp.MsaVoteModule = MsaVoteModule
