module.exports = async (itf, next) => {
	try {
		// create table in DB
		await itf.installMsaMod("db", "msa-db")
		const { VotesDb, VoteVoicesDb } = require("./db")
		await VotesDb.sync()
		await VoteVoicesDb.sync()
	} catch(err) { return next(err) }
	next()
}

