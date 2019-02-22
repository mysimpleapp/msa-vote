module.exports = async itf => {
	// create table in DB
	const { VotesDb, VoteVoicesDb } = require("./db")
	await VotesDb.sync()
	await VoteVoicesDb.sync()
}

