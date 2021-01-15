const { registerMsaBox } = Msa.require("utils")
const { db } = Msa.require("db")
const { userMdw } = Msa.require("user")
const { Vote, VoteSet } = require('./model')

class MsaVoteModule extends Msa.Module {

	constructor() {
		super()
		this.initApp()
	}

	getDbId(req, id) {
		return id
	}

	getIdFromDb(id) {
		return parseInt(id.substring(id.lastIndexOf('-') + 1))
	}

	nextDbId(req, id) {
		if (!id) return this.getDbId(req, 0)
		return this.getDbId(req, this.getIdFromDb(id) + 1)
	}

	exportVoteSet(req, voteSet) {
		if (!this.checkPerm(req, voteSet, 1))
			return null
		return {
			id: this.getIdFromDb(voteSet.id),
			nb: voteSet ? voteSet.nb : 0,
			sum: voteSet ? voteSet.sum : 0,
			canVote: this.checkPerm(req, voteSet, 2)
		}
	}

	async getVoteSet(id) {
		const dbVoteSet = await db.collection("msa_vote_sets").findOne({ _id:id })
		const voteSet = VoteSet.newFromDb(id, dbVoteSet)
		return voteSet
	}

	async getVoteSets(req, ids) {
		const dbVoteSets = await db.collection("msa_vote_sets").findOne({ _id: { $in: ids }})
		const dbVoteSetsById = {}
		for (let dbVoteSet of dbVoteSets) dbVoteSetsById[dbVoteSet._id] = dbVoteSet
		return ids
			.map(id => VoteSet.newFromDb(id, dbVoteSetsById[id]))
			.map(voteSet => this.exportVoteSet(req, voteSet))
	}

	async createNewVoteSet(req) {
		const id = this.getDbId(req, "")
		const res = await db.collection("msa_vote_sets_counter").findOneAndUpdate(
			{ _id: id },
			{
				$set: { _id: id },
				$inc: { value: 1 }
			},
			{
				upsert: true,
				new: true
			}
		)
		const voteSet = new VoteSet(this.getDbId(req, res.value.value))
		return voteSet
	}

	async upsertVote(id, voter, val) {
		const vote = new Vote(id, voter)
		vote.vote = val
		const vals = vote.formatForDb()
		await db.collection("msa_votes").updateOne(
			{ _id: vals._id },
			{ $set: vals },
			{ upsert: true }
		)
		return vote
	}

	async syncVoteSet(id) {
		// count votes
		const aggDoc = await db.collection("msa_votes").aggregate([{
			$match : {
				_id : new RegExp('^' + id)
			}
		}, {
			$group: {
				_id: null,
				"nb": { $sum: 1 },
				"sum": { $sum: "$vote" }
			}
		}]).next()
		// insert count in vote set DB
		await this.upsertVoteSet(id, aggDoc.sum, aggDoc.nb)
	}

	async upsertVoteSet(id, sum, nb) {
		const voteSet = new VoteSet(id)
		voteSet.sum = sum
		voteSet.nb = nb
		const vals = voteSet.formatForDb()
		await db.collection("msa_vote_sets").updateOne({
			_id: id
		}, {
			$set: {
				_id: id,
				sum: vals.sum,
				nb: vals.nb
			}
		}, {
			upsert: true
		})
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
		app.get("/_count/:id", userMdw, async (req, res, next) => {
			try {
				const id = this.getDbId(req, req.params.id)
				const voteSet = await this.getVoteSet(id)
				res.json(this.exportVoteSet(req, voteSet))
			} catch(err) { next(err) }
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
		app.post("/_vote", userMdw, async (req, res, next) => {
			try {
				const voteSet = await this.createNewVoteSet(req)
				res.json(this.exportVoteSet(req, voteSet))
			} catch(err) { next(err) }
		})

		// post vote
		app.post("/_vote/:id", userMdw, async (req, res, next) => {
			try {
				const id = this.getDbId(req, req.params.id),
					vote = req.body.vote
				const voter = this.getUserId(req)
				await this.upsertVote(id, voter, vote)
				await this.syncVoteSet(id)
				// returm ok
				res.sendStatus(200)
			} catch(err) { next(err) }
		})
	}
}

// box

class MsaVoteBoxModule extends MsaVoteModule {
	getDbId(req, id) {
		return `${req.msaBoxCtx.parentId}-${id}`
	}
}

registerMsaBox("msa-vote-box", {
	title: "Vote",
	mods: { "/vote": new MsaVoteBoxModule() },
	head: "/vote/msa-vote.js"
})

// export
module.exports = {
	startMsaModule: () => new MsaVoteModule("vote"),
	MsaVoteModule
}
