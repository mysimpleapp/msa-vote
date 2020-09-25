const { registerMsaBox } = Msa.require("utils")
const { withDb } = Msa.require("db")
const { userMdw } = Msa.require("user")
const { Vote, VoteSet } = require('./model')

class MsaVoteModule extends Msa.Module {

	constructor() {
		super()
		this.initApp()
	}

	getDbId(ctx, id) {
		return id
	}

	getIdFromDb(id) {
		return parseInt(id.substring(id.lastIndexOf('-') + 1))
	}

	nextDbId(ctx, id) {
		if (!id) return this.getDbId(ctx, 0)
		return this.getDbId(ctx, this.getIdFromDb(id) + 1)
	}

	exportVoteSet(ctx, voteSet) {
		if (!this.checkPerm(ctx, voteSet, 1))
			return null
		return {
			id: this.getIdFromDb(voteSet.id),
			nb: voteSet ? voteSet.nb : 0,
			sum: voteSet ? voteSet.sum : 0,
			canVote: this.checkPerm(ctx, voteSet, 2)
		}
	}

	async getVoteSet(ctx, id) {
		const dbVoteSet = await ctx.db.getOne("SELECT id, sum, nb, params FROM msa_vote_sets WHERE id=:id", { id })
		const voteSet = VoteSet.newFromDb(id, dbVoteSet)
		return voteSet
	}

	async getVoteSets(ctx, ids) {
		const dbVoteSets = await ctx.db.get("SELECT id, sum, nb, params FROM msa_vote_sets WHERE id IN (" + mjoin('?', ids.length, ',') + ")", ids)
		const dbVoteSetsById = {}
		for (let dbVoteSet of dbVoteSets) dbVoteSetsById[dbVoteSet.id] = dbVoteSet
		return ids
			.map(id => VoteSet.newFromDb(id, dbVoteSetsById[id]))
			.map(voteSet => this.exportVoteSet(ctx, voteSet))
	}

	async createNewVoteSet(ctx) {
		let voteSet
		await ctx.db.transaction(async () => {
			const row = await ctx.db.getOne("SELECT MAX(id) AS maxId FROM msa_vote_sets WHERE id LIKE :id FOR UPDATE", {
				id: this.getDbId(ctx, '%')
			})
			const newId = this.nextDbId(ctx, row.maxId)
			voteSet = new VoteSet(newId)
			await ctx.db.run("INSERT INTO msa_vote_sets (id) VALUES (:id)",
				voteSet.formatForDb(["id"]))
		})
		return voteSet
	}

	async upsertVote(ctx, id, voter, val) {
		const vote = new Vote(id, voter)
		vote.vote = val
		const values = vote.formatForDb()
		const res = await ctx.db.run("UPDATE msa_votes SET vote=:vote WHERE id=:id AND voter=:voter", values)
		if (res.nbChanges === 0)
			await ctx.db.run("INSERT INTO msa_votes (id, voter, vote) VALUES (:id, :voter, :vote)", values)
		return vote
	}

	async syncVoteSet(ctx, id) {
		// count votes
		const { sum, nb } = await ctx.db.getOne("SELECT SUM(vote) AS sum, COUNT(vote) AS nb FROM msa_votes WHERE id=:id", { id })
		// insert count in vote set DB
		await this.upsertVoteSet(ctx, id, sum, nb)
	}

	async upsertVoteSet(ctx, id, sum, nb) {
		const voteSet = new VoteSet(id)
		voteSet.sum = sum
		voteSet.nb = nb
		const values = voteSet.formatForDb(["id", "sum", "nb"])
		const res = await ctx.db.run("UPDATE msa_vote_sets SET sum=:sum, nb=:nb WHERE id=:id", values)
		if (res.nbChanges === 0)
			await ctx.db.run("INSERT INTO msa_vote_sets (id, sum, nb) VALUES (:id, :sum, :nb)", values)
		return voteSet
	}

	getUserId(ctx) {
		const user = ctx.session ? ctx.session.user : null
		return user ? user.name : ctx.connection.remoteAddress
	}

	checkPerm(ctx, voteSet, expVal, prevVal) {
		const perm = voteSet.params.perm.get()
		return perm.check(ctx.session.user, expVal, prevVal)
	}

	initApp() {
		const app = this.app

		// get vote count
		app.get("/_count/:id", userMdw, (req, res, next) => {
			withDb(async db => {
				const ctx = newCtx(req, { db })
				const id = this.getDbId(ctx, req.params.id)
				const voteSet = await this.getVoteSet(ctx, id)
				res.json(this.exportVoteSet(ctx, voteSet))
			}).catch(next)
		})
		/*
				// get vote counts
				app.get("/_counts/:idPrefix", userMdw, async (req, res, next) => {
					try {
						const idPrefix = this.getDbId(req, req.params.idPrefix)
						res.json(await this.getVoteSets(req, idPrefix))
					} catch(err) { next(err) }
				})
		*/

		// post vote set
		app.post("/_vote", userMdw, (req, res, next) => {
			withDb(async db => {
				const ctx = newCtx(req, { db })
				const voteSet = await this.createNewVoteSet(ctx)
				res.json(this.exportVoteSet(ctx, voteSet))
			}).catch(next)
		})

		// post vote
		app.post("/_vote/:id", userMdw, (req, res, next) => {
			withDb(async db => {
				const ctx = newCtx(req, { db })
				const id = this.getDbId(ctx, req.params.id),
					vote = req.body.vote
				const voter = this.getUserId(ctx)
				await this.upsertVote(ctx, id, voter, vote)
				await this.syncVoteSet(ctx, id)
				// returm ok
				res.sendStatus(200)
			}).catch(next)
		})
	}
}

// box

class MsaVoteBoxModule extends MsaVoteModule {
	getDbId(req, id) {
		return `${req.msaBoxCtx.parentId}-${id}`
	}
}

registerMsaBox("msa-vote", {
	title: "Vote",
	mods: { "/vote": new MsaVoteBoxModule() },
	head: "/vote/msa-vote.js",
	createRef: "/vote/msa-vote.js:createMsaBox",
	initRef: "/vote/msa-vote.js:initMsaBox",
	exportRef: "/vote/msa-vote.js:exportMsaBox"
})

// utils

function newCtx(req, kwargs) {
	const ctx = Object.create(req)
	Object.assign(ctx, kwargs)
	return ctx
}

function mjoin(a, len, sep) {
	let res = ""
	for (let i = 0; i < len; ++i) {
		if (i > 0) res += sep
		res += a
	}
	return res
}

// export
module.exports = {
	installMsaModule: async itf => {
		await require("./install")(itf)
	},
	startMsaModule: () => new MsaVoteModule("vote"),
	MsaVoteModule
}
