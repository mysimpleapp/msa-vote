const { join } = require('path')
const { Orm } = Msa.require("db")
const { userMdw } = Msa.require("user")
const { VoteSetsDb, VotesDb } = require('./db')
const { VotePerm } = require("./perm")
const { voteParamsDef } = require('./params')

const defPerm = voteParamsDef.get("perm").defVal
const nullPerm = new VotePerm()

class MsaVoteModule extends Msa.Module {

	constructor(dbIdPrefix){
		super()
		this.dbIdPrefix = dbIdPrefix
		this.initDb()
		this.initApp()
	}

	initDb(){
		this.setsDb = VoteSetsDb
		this.db = VotesDb
	}

	getDbIdPrefix(req){
		return this.dbIdPrefix
	}

	buildDbId(req, id){
		return this.getDbIdPrefix(req) + '-' + id
	}

	formatVoteSet(req, id, voteSet){
		if(!this.checkPerm(req, voteSet, 1))
			return null
		return {
			id: id,
			nb: voteSet ? voteSet.nb : 0,
			sum: voteSet ? voteSet.sum : 0,
			canVote: this.checkPerm(req, voteSet, 2)
		}
	}

	async getVoteSet(req, id){
		const voteSet = await this.setsDb.findOne({ where: { id }})
		return this.formatVoteSet(req, id, voteSet)
	}

	async getVoteSets(req, ids){
		const voteSets = await this.setsDb.findAll({
			where:{ id: { [Orm.Op.in]: ids }}
		})
		return ids
			.map(id => this.formatVoteSet(req, id, getById(voteSets, id)))
			.filter(voteSet => voteSet !== null)
	}

	getUserId(req){
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
		app.get("/_count/:id", userMdw, async (req, res, next) => {
			try {
				const id = this.buildDbId(req, req.params.id)
				res.json(await this.getVoteSet(req, id))
			} catch(err) { next(err) }
		})
/*
		// get vote counts
		app.get("/_counts/:idPrefix", userMdw, async (req, res, next) => {
			try {
				const idPrefix = this.buildDbId(req, req.params.idPrefix)
				res.json(await this.getVoteSets(req, idPrefix))
			} catch(err) { next(err) }
		})
*/

		// post vote
		app.post("/_vote/:id", userMdw, async (req, res, next) => {
			try {
				const id = this.buildDbId(req, req.params.id),
					vote = req.body.vote
				// insert vote in DB
				const voter = this.getUserId(req)
				await this.db.upsert(
					{ id, voter, vote },
					{ where: { id, voter }})
				// count votes
				const count = await this.db.findOne({
					attributes: [
						[ Orm.fn('SUM', Orm.col('vote')), 'sum' ],
						[ Orm.fn('COUNT', Orm.col('vote')), 'nb' ]],
					where: { id }})
				const { sum = 0, nb = 0 } = count.dataValues
				// insert count in vote set DB
				await this.setsDb.upsert(
					{ id, sum, nb },
					{ where: { id }})
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

function getById(arr, id){
	for(let i=0, len=arr.length; i<len; ++i){
		const el = arr[i]
		if(el.id === id) return el
	}
	return null
}
	

// export
const exp = module.exports = new MsaVoteModule("vote")
exp.MsaVoteModule = MsaVoteModule
